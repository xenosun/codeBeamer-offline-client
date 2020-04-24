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
import {Storage} from '@ionic/storage';
import {ProjectModel} from '../models/project.model';
import {TrackerModel} from '../models/tracker.model';
import {DownloadedTestRun} from '../models/downloaded-test-run';
import {RequestCacheEntry} from '../interceptors/request-cache';
import {OfflineLoginData} from '../models/offline-login-data';
import {ProjectWithBugTrackers} from '../models/project-with-bug-trackers';
import {AppService} from './app.service';
import {Utils} from '../utils/utils';
import {LogProvider} from './ionic-log-file-appender/log.service';

@Injectable()
export class StorageService {

  private STORED_TEST_RUN_DATA_KEY = 'downloaded_test_run_data';
  private STORED_PROJECT_KEY = 'project_path';
  private STORED_TRACKER_KEY = 'tracker_path';
  private STORED_PROJECT_TRACKER_INFO = 'project_bugTracker_info';
  private STORED_OFFLINE_LOGIN_CODES = 'offline_code';
  private REQUEST_CACHE_KEY = 'request_cache';

  constructor(
    private appService: AppService,
    private storage: Storage,
    private logger: LogProvider,
  ) {
  }

  /**
   * Save the given project to the persistent store for the current user on the current server.
   *
   * Used to save the user's preferred project selection so the next time it will be selected automatically.
   */
  public async saveSelectedProject(project: ProjectModel) {
    const storagePrefix = await this.getStoragePrefix();
    return this.storage.set(storagePrefix + this.STORED_PROJECT_KEY, project);
  }

  /**
   * Returns the previously saved project of the current user on the current server from the persistent store.
   */
  public async getSavedProject(): Promise<ProjectModel> {
    const storagePrefix = await this.getStoragePrefix();
    return this.storage.get(storagePrefix + this.STORED_PROJECT_KEY);
  }

  /**
   * Save the given tracker to the persistent store for the current user on the current server.
   *
   * Used to save the user's preferred Test Run tracker selection so the next time it will be selected automatically.
   */
  public async saveSelectedTracker(tracker: TrackerModel) {
    const storagePrefix = await this.getStoragePrefix();
    return this.storage.set(storagePrefix + this.STORED_TRACKER_KEY, tracker);
  }

  /**
   * Returns the previously saved Test Run tracker of the current user on the current server from the persistent store.
   */
  public async getSavedTracker(): Promise<TrackerModel> {
    const storagePrefix = await this.getStoragePrefix();
    return this.storage.get(storagePrefix + this.STORED_TRACKER_KEY);
  }

  /**
   * Returns the stored DownloadedTestRun array that contains those Test Runs data that has been 'downloaded' previously
   * for offline running.
   */
  public async getDownloadedTestRuns(): Promise<DownloadedTestRun[]> {
    const storagePrefix = await this.getStoragePrefix();
    return this.storage.get(storagePrefix + this.STORED_TEST_RUN_DATA_KEY);
  }

  /**
   * Returns exactly one Test Run if the ID is given. ID is the Test Run's ID.
   */
  public async getSingleDownloadedTestRun(id: number): Promise<DownloadedTestRun> {
    const storagePrefix = await this.getStoragePrefix();
    const testRuns: DownloadedTestRun[] = await this.storage.get(storagePrefix + this.STORED_TEST_RUN_DATA_KEY);
    return testRuns.find(tr => +tr.testRunId === +id);
  }

  /**
   * Save the given array of test runs to the persistent storage.
   */
  public async saveDownloadedTestRuns(testRuns: DownloadedTestRun[]) {
    const storagePrefix = await this.getStoragePrefix();
    return this.storage.set(storagePrefix + this.STORED_TEST_RUN_DATA_KEY, testRuns);
  }

  /**
   * Save the given test run to the persistent storage along with the other,
   * already saved test runs.
   */
  public async saveSingleDownloadedTestRun(testRun: DownloadedTestRun) {
    let saveData = [testRun];
    const savedTestRuns: DownloadedTestRun[] = await this.getDownloadedTestRuns();
    if (savedTestRuns) {
      saveData = [...savedTestRuns, ...saveData];
    }
    return this.saveDownloadedTestRuns(saveData);
  }

  /**
   * Updates a stored DownloadedTestRun data.
   *
   * The existing DownloadedTestRun comparison is done by matching the contained Test Run IDs.
   */
  public async updateDownloadedTestRun(testRunData: DownloadedTestRun) {
    const downloadedTestRuns: DownloadedTestRun[] = await this.getDownloadedTestRuns();
    const index = downloadedTestRuns.findIndex((tr: DownloadedTestRun) =>
      tr.testRunId === testRunData.testRunId
    );
    if (index >= 0) {
      // replace
      downloadedTestRuns.splice(index, 1, testRunData);
      await this.saveDownloadedTestRuns(downloadedTestRuns);
    }
  }

  /**
   * Save the request cache into the persistent storage.
   */
  public saveRequestCache(cache: Map<string, RequestCacheEntry>) {
    return this.storage.set(this.REQUEST_CACHE_KEY, cache);
  }

  /**
   * Return the saved request cache from the persistent storage.
   */
  public async getRequestCache(): Promise<Map<string, RequestCacheEntry>> {
    const cache = await this.storage.get(this.REQUEST_CACHE_KEY);
    return cache || new Map<string, RequestCacheEntry>();
  }

  /**
   * Saves the given offline login code for the current user on the current server to the persistent store.
   *
   * There are other information that being saved along with the code like:
   * 1. the current server base url
   * 2. the current user
   * 3. the current user's login token
   */
  public async saveOfflineLoginCodeForCurrentUserOnCurrentServer(code: string) {
    let savedOfflineLoginData = await this.storage.get(this.STORED_OFFLINE_LOGIN_CODES) as Array<OfflineLoginData>;
    savedOfflineLoginData = savedOfflineLoginData || [];
    const offlineLoginData: OfflineLoginData = {
      code,
      base: this.appService.base,
      user: this.appService.currentUser,
      token: this.appService.token
    };
    const existingOfflineInfoIndex = savedOfflineLoginData.findIndex(offlineCodeInfo =>
      +offlineCodeInfo.user.id === +this.appService.currentUser.id
      && offlineCodeInfo.base === this.appService.base);
    if (existingOfflineInfoIndex >= 0) {
      // replace
      savedOfflineLoginData.splice(existingOfflineInfoIndex, 1, offlineLoginData);
    } else {
      savedOfflineLoginData.push(offlineLoginData);
    }
    await this.storage.set(this.STORED_OFFLINE_LOGIN_CODES, savedOfflineLoginData);
  }

  /**
   * Returns the saved offline login information that associated with the given code if there is any.
   *
   * The returned data contains the:
   * 1. offline login code
   * 2. base url of the server where the user were logged in when the login code was saved
   * 3. the user itself
   * 4. the user's login token for the server mentioned at 2.
   *
   * @param code the offline login code.
   * @returns the offline login data that belongs to the given offline login code.
   */
  public async getOfflineLoginDataByCode(code: string): Promise<OfflineLoginData> {
    const data = await this.storage.get(this.STORED_OFFLINE_LOGIN_CODES) as Array<OfflineLoginData>;
    if (data) {
      return data.find(offlineCodeInfo => offlineCodeInfo.code === code);
    }
    return null;
  }

  /**
   * Save the given list of projects-with-bug-trackers data to the persistent storage.
   */
  public async saveBugTrackerInfoForMultipleProjects(projectWithBugTrackers: ProjectWithBugTrackers[]) {
    const storagePrefix = await this.getStoragePrefix();
    return this.storage.set(storagePrefix + this.STORED_PROJECT_TRACKER_INFO, projectWithBugTrackers);
  }

  /**
   * Returns the previously saved projects-with-bug-trackers data from the persistent store.
   */
  public async getBugTrackerInfoForMultipleProjects(): Promise<ProjectWithBugTrackers[]> {
    const storagePrefix = await this.getStoragePrefix();
    return this.storage.get(storagePrefix + this.STORED_PROJECT_TRACKER_INFO);
  }

  /**
   * Collect the saved project and tracker path (if there is any)
   * and returns them concatenated in a string representing a route.
   *
   * @returns concatenated url path that contains the saved project and tracker paths if there is any.
   */
  public async collectSavedProjectAndTrackerPages(): Promise<string> {
    this.logger.log('Collecting saved project and tracker path!');
    let url = '/projects';
    const project = await this.getSavedProject();
    this.logger.log(`Saved project: [${JSON.stringify(project)}]`);
    if (project) {
      url = `/project/${Utils.uri2id(project.uri)}/trackers`;
    }
    const tracker = await this.getSavedTracker();
    this.logger.log(`Saved tracker: [${JSON.stringify(tracker)}]`);
    if (tracker) {
      url = `/project/${Utils.uri2id(project.uri)}/tracker/${Utils.uri2id(tracker.uri)}/available-test-runs`;
    }
    this.logger.log(`Constructed URL: [${url}]`);
    return url;
  }

  private async getStoragePrefix(): Promise<string> {
    if (!this.appService.currentUser) {
      await this.appService.notifyUserAboutError('There is no current user!', true);
    } else if (!this.appService.currentUser.id) {
      if (this.appService.currentUser.uri) {
        this.appService.currentUser.id = +Utils.uri2id(this.appService.currentUser.uri);
      } else {
        await this.appService.notifyUserAboutError('The current user does not have an ID!', true);
      }
    }
    return `${this.appService.base}/user/${this.appService.currentUser.id}/`;
  }
}
