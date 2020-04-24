/**
 * Copyright 2020 Intland Software GmbH
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import {Injectable} from '@angular/core';
import {AppService, ErrorVO} from './app.service';
import {TestRun} from '../models/test-run';
import {Subject} from 'rxjs';
import {InitializedTestRun} from '../models/initialized-test-run';
import {DownloadedTestRun} from '../models/downloaded-test-run';
import {InitializedTestCase} from '../models/initialized-test-case';
import {TestCase} from '../models/test-case';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Platform} from '@ionic/angular';
import {Utils} from '../utils/utils';
import {TestStepWithResult} from '../models/test-step-with-result';
import {ProjectModel} from '../models/project.model';
import {TrackerModel} from '../models/tracker.model';
import {TrackerItemPage} from '../models/tracker-item-page';
import {PlatformType} from '../models/platform-type';
import {ProjectWithBugTrackers} from '../models/project-with-bug-trackers';
import {TrackerWithNewItemSchema} from '../models/tracker-with-new-item-schema';
import {TrackerItemModel} from '../models/tracker-item.model';
import {StorageService} from './storage.service';
import {Attachment} from '../models/attachment';
import {ItemComment} from '../models/item-comment';
import {FileSystemService} from './file-system.service';
import {
  File as IonicFile,
  FileEntry
} from '@ionic-native/file/ngx';
import * as XRegExp from 'xregexp';
import {WebView} from '@ionic-native/ionic-webview/ngx';
import {LogProvider} from './ionic-log-file-appender/log.service';
import {NewItemSchema} from '../models/new-item-schema';

@Injectable({providedIn: 'root'})
export class TestRunService {

  downloadProcess = new Subject();

  fileStoreDirectory: string;

  constructor(private appService: AppService,
              private http: HttpClient,
              private file: IonicFile,
              private platform: Platform,
              private storageService: StorageService,
              private fileSystemService: FileSystemService,
              private webview: WebView,
              private logger: LogProvider) {
  }

  /**
   * Returns the Test Run type Tracker Items of the given tracker that is in the given project.
   *
   * @param projectId target project's ID
   * @param trackerId target tracker's ID
   * @param page page number
   * @returns Test runs of the given project in the given tracker.
   */
  public async getTestRuns(projectId: number, trackerId: number, page: number = 1): Promise<TestRun[]> {
    if (page < 1) {
      page = 1;
    }
    const requestURL = `/rest/query/page/${page}?queryString=project.id IN (${projectId}) AND tracker.id IN (${trackerId}) AND`
      + ` parentId IS NULL AND assignedTo IN ('current user')`;
    const response = await this.appService.get(requestURL);
    if (response && !(response instanceof ErrorVO)) {
      return (response as TrackerItemPage).trackerItems.items;
    }
    console.error(response);
    return await new Promise((resolve, reject) => {
      this.appService.handleServerRequestFail(
        'Server request failed',
        `Failed to get the test runs of tracker: ${trackerId}`,
        [
          {text: 'Ignore', handler: () => reject()},
          {
            text: 'Retry', handler: () => {
              this.getTestRuns(projectId, trackerId).then(secondTryResult => {
                resolve(secondTryResult);
              });
            }
          },
        ]
      ).then();
    });
  }

  /**
   * Query and store all the user accessible
   * project-with-bug-tracker-item-creation-schema information in the persistent store.
   */
  public async saveBugTrackerInfoOfAllAvailableProjects() {
    const projectsWithBugTrackers = await this.getAllProjectsWithBugTrackersOfCurrentUser();
    await this.storageService.saveBugTrackerInfoForMultipleProjects(projectsWithBugTrackers);
  }

  /**
   * Queries all the projects (accessible by the current user) from the server.
   * Besides the project data, all bug trackers and item creation schemas are also queried
   * for each project.
   *
   * @returns a list of objects, each contains a project and a list of bug trackers with item creation schemas.
   */
  public async getAllProjectsWithBugTrackersOfCurrentUser(): Promise<ProjectWithBugTrackers[]> {
    const projects: ProjectModel[] = await this.appService.get(`rest/user/${this.appService.currentUser.id}/projects`);
    if (projects instanceof ErrorVO) {
      console.error(projects);
      return await new Promise((resolve, reject) => {
        this.appService.handleServerRequestFail(
          'Server request failed',
          `Failed to get the projects list.`,
          [
            {text: 'Ignore', handler: () => reject()},
            {
              text: 'Retry', handler: () => {
                this.getAllProjectsWithBugTrackersOfCurrentUser().then(secondTryResult => {
                  resolve(secondTryResult);
                });
              }
            },
          ]
        ).then();
      });
    }
    return await Promise.all(
      projects.map(async (project: ProjectModel) => {
        const projectId = +Utils.uri2id(project.uri);
        const bugTrackersWithNewItemSchema: TrackerWithNewItemSchema[] = await this.getBugTrackersWithNewItemSchemaOfProject(projectId);
        return {
          project,
          bugTrackers: bugTrackersWithNewItemSchema
        };
      })
    );
  }

  /**
   * Queries all bug trackers of the given project from the server.
   * Besides the bug tracker data, for each bug tracker, the new item creation
   * schema is also queried.
   *
   * @returns a list of objects that each contains a bug tracker and the new item creation schema for that tracker.
   */
  private async getBugTrackersWithNewItemSchemaOfProject(projectId: number): Promise<TrackerWithNewItemSchema[]> {
    const trackers: TrackerModel[] = await this.appService.get('rest/project/' + projectId + '/trackers/qualifier/bug');
    if (trackers instanceof ErrorVO) {
      console.error(trackers);
      return await new Promise((resolve, reject) => {
        this.appService.handleServerRequestFail(
          'Server request failed',
          `Failed to get the bug trackers of project: ${projectId}`,
          [
            {text: 'Ignore', handler: () => reject()},
            {
              text: 'Retry', handler: () => {
                this.getBugTrackersWithNewItemSchemaOfProject(projectId).then(secondTryResult => {
                  resolve(secondTryResult);
                });
              }
            },
          ]
        ).then();
      });
    }
    return await Promise.all(
      trackers.map(async (bugTracker: TrackerModel) => {
        const newItemSchema: NewItemSchema = await this.getNewItemSchemaOfTracker(+Utils.uri2id(bugTracker.uri));
        return {
          tracker: bugTracker,
          newItemSchema
        };
      })
    );
  }

  /**
   * Queries the new item schema for the given tracker from the server.
   *
   * @returns the schema for a new item.
   */
  private async getNewItemSchemaOfTracker(trackerId: number): Promise<NewItemSchema> {
    const response = await this.appService.get('rest/tracker/' + trackerId + '/newItem');
    if (!(response instanceof ErrorVO)) {
      return response;
    }
    console.error(response);
    return null;
    /*
    return await new Promise((resolve, reject) => {
      this.appService.handleServerRequestFail(
        'Server request failed',
        `Failed to get the item creation schema for tracker: ${trackerId}`,
        [
          {text: 'Ignore', handler: () => reject()},
          {
            text: 'Retry', handler: () => {
              this.getNewItemSchemaOfTracker(trackerId).then(secondTryResult => {
                resolve(secondTryResult);
              });
            }
          },
        ]
      ).then();
    });
     */
  }

  /**
   * Converts the given wiki format text to HTML format.
   * After the conversion it also replaces the image URLs from
   * URLs that points to the server to URLs that points to the file system where
   * the images are stored.
   *
   * @param wikiText the wiki format text to convert.
   * @param attachments the list of attachments that are being used in the wiki text.
   * @param itemId the tracker item's ID that the wiki text belongs to.
   *
   * @returns the converted HTML text.
   */
  public async convertWikiToHtml(wikiText: string, attachments: Attachment[], itemId?: number): Promise<string> {
    if (!wikiText) {
      return wikiText;
    }
    const param: {content: string, entityRef?: string} = {
      content: wikiText
    };
    if (itemId) {
      param.entityRef = `[ISSUE:${itemId}]`;
    }
    const response = await this.appService.post('rest/convertWikiToHTML', param);
    return this.replaceImageURLs(response.content, attachments, itemId);
  }

  /**
   * Replaces the image URLs in the given text from URLs that points to the server
   * to URLs that points to the file system where the images are stored.
   *
   * @param text that contains server referenced URLs.
   * @param attachments a list of attachments that are being used in the text.
   * @param itemId the tracker item's ID that the wiki text belongs to.
   *
   * @returns the given text where all the images points to the filesystem stored images
   * instead of the server.
   */
  public replaceImageURLs(text: string, attachments: Attachment[], itemId?: number): string {
    const imgRegex = XRegExp('<img\\s+.*src="(?<url>[^\\s]*)".*\\/>', 'g');
    const imageTags = XRegExp.match(text, imgRegex);

    for (const imageTag of imageTags) {
      const imageTagExtracted = XRegExp.exec(imageTag, imgRegex);
      let imageSrc = imageTagExtracted.url;
      if (imageSrc.startsWith('/cb')) {
        imageSrc = imageSrc.replace('/cb', '');
      }
      const resourceUrl = this.appService.base + imageSrc;

      let relatedAttachment = null;
      if (attachments && attachments.length) {
        for (const attachment of attachments) {
          if (imageTagExtracted.url.includes(attachment.name) && attachment.path) {
            relatedAttachment = attachment;
            break;
          }
        }
      }

      if (relatedAttachment) {
        text = XRegExp.replace(text, imageTagExtracted.url, relatedAttachment.path);
      } else {
        text = XRegExp.replace(text, imageTagExtracted.url, resourceUrl);
      }
    }

    return text;
  }

  public replaceAnchorURLs(text: string): string {
    return text;
  }

  /**
   * Queries all the Test Run type trackers of the given project from the server.
   *
   * @returns a list of test run type trackers.
   */
  public async getTestRunTypeTrackersOfProject(projectId: number): Promise<TrackerModel[]> {
    const testRunTrackers = await this.appService.get(`rest/project/${projectId}/trackers/qualifier/testrun`);
    if (!(testRunTrackers instanceof ErrorVO)) {
      return testRunTrackers;
    }
    console.error(testRunTrackers);
    return await new Promise((resolve, reject) => {
      this.appService.handleServerRequestFail(
        'Server request failed',
        `Failed to get the test run type trackers of project: ${projectId}`,
        [
          {text: 'Ignore', handler: () => reject()},
          {
            text: 'Retry', handler: () => {
              this.getTestRunTypeTrackersOfProject(projectId).then(secondTryResult => {
                resolve(secondTryResult);
              });
            }
          },
        ]
      ).then();
    });
  }

  /**
   * Queries all the projects that the current user has access to from the server.
   *
   * @returns a list of projects.
   */
  public async getProjectsOfCurrentUser(): Promise<ProjectModel[]> {
    const projects = await this.appService.get(`rest/user/${this.appService.currentUser.id}/projects`);
    if (!(projects instanceof ErrorVO)) {
      return projects;
    }
    this.logger.err('An error occurred during requesting user\'s projects!', projects);
    return await new Promise((resolve, reject) => {
      this.appService.handleServerRequestFail(
        'Server request failed',
        `Failed to get project list of the current user.`,
        [
          {text: 'Ignore', handler: () => reject()},
          {
            text: 'Retry', handler: () => {
              this.getProjectsOfCurrentUser().then(secondTryResult => {
                resolve(secondTryResult);
              });
            }
          },
        ]
      ).then();
    });
  }

  /**
   * Removes the downloaded test run data identified by the given ID.
   */
  public async deleteDownloadedTestRun(testRunId: number) {
    const downloadedTestRuns: DownloadedTestRun[] = await this.storageService.getDownloadedTestRuns();
    if (this.platform.is(PlatformType.CORDOVA)) {
      const found: DownloadedTestRun = downloadedTestRuns.find(testRun => testRun.testRunId === testRunId);
      await this.fileSystemService.removeAttachmentsOfDownloadedTestRun(found);
    }
    await this.storageService.saveDownloadedTestRuns(downloadedTestRuns.filter(testRun => testRun.testRunId !== testRunId));
  }

  /**
   * Downloads all the necessary data of the given Test Runs that required to run the Test Runs offline.
   */
  public async downloadTestRuns(testRuns: TestRun[]) {
    if (!testRuns || !testRuns.length) {
      return null;
    }
    /*
    await Promise.all(
      testRuns.map(async (testRun: TestRun) => {
        await this.downloadTestRunData(testRun);
        await this.appService.post(`rest/offline/testRunner/setTestRunStatus/${testRun.id}`, 'Suspended');
        this.downloadProcess.next(testRun);
      })
    );
     */
    for (const testRun of testRuns) {
      await this.downloadTestRunData(testRun);
      await this.appService.post(`rest/offline/testRunner/setTestRunStatus/${testRun.id}`, 'Suspended');
      this.downloadProcess.next(testRun);
    }
  }

  private async downloadAttachmentsOfTestRunOrTestCase(savePath: string, testRunOrCase: TestRun | TestCase) {
    if (!testRunOrCase.comments || !testRunOrCase.comments.length) {
      return;
    }
    /*
    await Promise.all(
      testRunOrCase.comments.map(comment => {
        if (!comment.attachments || !comment.attachments.length) {
          return;
        }
        await Promise.all(
          comment.attachments.map(attachment => this.downloadAttachment(savePath, attachment))
        );
      })
    );
     */
    for (const comment of testRunOrCase.comments) {
      if (!comment.attachments || !comment.attachments.length) {
        continue;
      }
      for (const attachment of comment.attachments) {
        await this.downloadAttachment(savePath, attachment);
      }
    }
  }

  private async downloadAttachment(savePath: string, attachment: Attachment) {
    let headers: HttpHeaders = new HttpHeaders();
    headers = headers.append('Accept', 'image/*');

    const response: Blob = await this.http.get(`${this.appService.base}/rest${attachment.uri}`,
      {
        responseType: 'blob',
        headers,
        withCredentials: true
      }).toPromise();

    const fEntry: FileEntry = await this.fileSystemService.storeFile(savePath, attachment.name, response);
    attachment.path = this.webview.convertFileSrc(fEntry.toURL());
    attachment.directory = savePath;
  }

  private async initializeTestRunner(tr: TestRun): Promise<{
    initializedTestRun: InitializedTestRun,
    initializedTestCases: InitializedTestCase[]
  }> {
    const responses = await Promise.all(
      tr.testCases.map((tc, i: number) => this.initializeTestCase(tr, i))
    );
    return {
      initializedTestRun: new InitializedTestRun(responses[0]),
      initializedTestCases: responses.map(response => new InitializedTestCase(response))
    };
  }

  private async initializeTestCase(testRun: TestRun, testCaseIndex: number) {
    const requestURL = `/rest/testRunner/initTestRunner/${testRun.id}/${testCaseIndex}`;
    return this.appService.get(requestURL)
      .then(response => {
        if (!(response instanceof ErrorVO)) {
          return response;
        }
        console.error(response);
        return new Promise((resolve, reject) => {
          this.appService.handleServerRequestFail(
            'Server request failed',
            `Failed to initialize the ${testCaseIndex}. test case of test run: ${testRun.id}`,
            [
              {text: 'Ignore', handler: () => reject()},
              {
                text: 'Retry', handler: () => {
                  this.initializeTestCase(testRun, testCaseIndex).then(secondTryResult => {
                    resolve(secondTryResult);
                  });
                }
              },
            ]
          ).then();
        });
      });
  }

  private async downloadAttachments(initializedTestRun: InitializedTestRun, initializedTestCases: InitializedTestCase[]) {
    if (this.platform.is(PlatformType.CORDOVA)) {
      if (this.platform.is(PlatformType.ANDROID)) {
        this.fileStoreDirectory = this.file.externalRootDirectory;
      } else if (this.platform.is(PlatformType.IOS)) {
        this.fileStoreDirectory = this.file.documentsDirectory;
      } else {
        this.fileStoreDirectory = this.file.dataDirectory;
      }
      /*
      await Promise.all([
        this.downloadAttachmentsOfTestRunOrTestCase(this.fileStoreDirectory, initializedTestRun.testRun),
        ...initializedTestCases.map((ic: InitializedTestCase) =>
          this.downloadAttachmentsOfTestRunOrTestCase(this.fileStoreDirectory, ic.testCaseTrackerItem)
        )
      ]);
       */
      await this.downloadAttachmentsOfTestRunOrTestCase(this.fileStoreDirectory, initializedTestRun.testRun);
      for (const initializedTestCase of initializedTestCases) {
        await this.downloadAttachmentsOfTestRunOrTestCase(this.fileStoreDirectory, initializedTestCase.testCaseTrackerItem);
      }
    }
  }

  private async convertAllTestCaseWikiFieldToHTML(initializedTestCase: InitializedTestCase) {
    const testCaseId = +Utils.uri2id(initializedTestCase.testCaseTrackerItem.uri);
    const attachmentsOfTestCase: Attachment[] = this.getAttachmentsOfTestCase(initializedTestCase);

    await Promise.all([
      // pre-action
      this.convertWikiToHtml(initializedTestCase.testCaseTrackerItem.preAction, attachmentsOfTestCase, testCaseId)
        .then(html => initializedTestCase.testCaseTrackerItem.preAction = html),
      // description
      this.convertWikiToHtml(initializedTestCase.testCaseTrackerItem.description, attachmentsOfTestCase, testCaseId)
        .then(html => initializedTestCase.testCaseTrackerItem.description = html),
      // post-action
      this.convertWikiToHtml(initializedTestCase.testCaseTrackerItem.postAction, attachmentsOfTestCase, testCaseId)
        .then(html => initializedTestCase.testCaseTrackerItem.postAction = html)
    ]);

    initializedTestCase.testStepsWithResults.forEach((step: TestStepWithResult) => {
      step.actionPreview = this.replaceImageURLs(step.actionPreview, attachmentsOfTestCase, testCaseId);
      step.expectedResultPreview = this.replaceImageURLs(step.expectedResultPreview, attachmentsOfTestCase, testCaseId);
    });
  }

  private async convertTestRunDescriptionToHTML(testRun: TestRun, attachments: Attachment[], id: number) {
    testRun.description = await this.convertWikiToHtml(testRun.description, attachments, id);
  }

  private async convertAllWikiMarkupsToHTML(initializedTestRun: InitializedTestRun, initializedTestCases: InitializedTestCase[]) {
    const attachmentsOfTestRun: Attachment[] = this.getAttachmentsOfTestRun(initializedTestRun);
    const testRunId = +Utils.uri2id(initializedTestRun.testRun.uri);

    await Promise.all([
      this.convertTestRunDescriptionToHTML(initializedTestRun.testRun, attachmentsOfTestRun, testRunId),
      ...initializedTestCases.map((ic: InitializedTestCase) => this.convertAllTestCaseWikiFieldToHTML(ic))
    ]);
  }

  private async downloadTestRunData(tr: TestRun): Promise<void> {
    const {initializedTestRun, initializedTestCases} = await this.initializeTestRunner(tr);

    await this.downloadAttachments(initializedTestRun, initializedTestCases);
    await this.convertAllWikiMarkupsToHTML(initializedTestRun, initializedTestCases);

    const data: DownloadedTestRun = {
      testRunId: +tr.id,
      testRunName: tr.name,
      initializedTestRun,
      initializedTestCases,
      downloadedAt: new Date()
    };

    await this.storageService.saveSingleDownloadedTestRun(data);
  }

  private collectAttachments(comments: ItemComment[]): Attachment[] {
    if (!comments || !comments.length) {
      return [];
    }
    return comments.reduce((prev, curr: ItemComment) => {
      if (curr.attachments && curr.attachments.length) {
        return [...prev, ...curr.attachments];
      }
      return [...prev];
    }, []);
  }


  private getAttachmentsOfTestRun(itr: InitializedTestRun): Attachment[] {
    return this.collectAttachments(itr.testRun.comments);
  }

  private getAttachmentsOfTestCase(ic: InitializedTestCase): Attachment[] {
    return this.collectAttachments(ic.testCaseTrackerItem.comments);
  }

}
