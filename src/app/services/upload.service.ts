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

import {HttpClient} from '@angular/common/http';
import {ChangeDetectorRef, Injectable} from '@angular/core';
import {AppService, ErrorVO} from './app.service';
import {Subject} from 'rxjs';
import {UploadFile} from '../models/upload-file';
import {AlertController, LoadingController, Platform} from '@ionic/angular';
import {File as IonicFile} from '@ionic-native/file/ngx';
import {InitializedTestCase} from '../models/initialized-test-case';
import {Utils} from '../utils/utils';
import {TestStepWithResult} from '../models/test-step-with-result';
import {InitializedTestRun} from '../models/initialized-test-run';
// @ts-ignore
import * as Resumable from 'resumablejs';
import * as _ from 'lodash';
import {PlatformType} from '../models/platform-type';
import {LogProvider} from './ionic-log-file-appender/log.service';

@Injectable()
export class UploadService {

  fileAdded = new Subject<any>();
  pause = new Subject<any>();
  complete = new Subject<any>();
  fileSuccess = new Subject<{ file: any, message: any }>();
  fileError = new Subject<{ file: any, message: any }>();
  progress = new Subject<{ file: any, message: any }>();
  fileProgress = new Subject<any>();

  res;

  fileStoreDirectory;

  constructor(public http: HttpClient,
              public appService: AppService,
              public platform: Platform,
              public file: IonicFile,
              public alertCtrl: AlertController,
              public loadingCtrl: LoadingController,
              private logger: LogProvider) {
    if (this.platform.is(PlatformType.CORDOVA)) {
      if (this.platform.is(PlatformType.ANDROID)) {
        this.fileStoreDirectory = this.file.externalRootDirectory;
      } else if (this.platform.is(PlatformType.IOS)) {
        this.fileStoreDirectory = this.file.documentsDirectory;
      } else {
        this.fileStoreDirectory = this.file.dataDirectory;
      }
    }
  }

  /**
   * Uploads a file to the server.
   *
   * The upload starts with reading the file from the given location, and then begin to upload with
   * resumable.js
   */
  upload(upload: UploadFile) {
    this.initResumableUploader(upload.conversationId);
    if (this.platform.is(PlatformType.CORDOVA)) {
      this.file.readAsArrayBuffer(upload.path, upload.fileName).then((result: ArrayBuffer) => {
        // tslint:disable-next-line
        result['size'] = result.byteLength;
        // tslint:disable-next-line
        result['name'] = upload.fileName;
        this.res.addFile(result);
      }).catch(err => {
        console.error('Error during reading file from fs!', err);
        this.deviceAlert('Error during reading file as buffer', JSON.stringify(err)).then();
      });
    } else {
      if (upload.file) {
        this.res.addFile(upload.file);
      }
    }
  }

  /**
   * Uploads the result of a completed Test Case.
   *
   * This method should called when all files and attachments are already uploaded.
   * The upload is executed by calling the testrunner/saveTestRun REST API method.
   *
   * After Uploading the Test Case the bugs reported for the test case are also being uploaded.
   */
  async uploadTestCaseData(
    testRun: InitializedTestRun,
    itc: InitializedTestCase,
    conversationId: string,
    changeDetector: ChangeDetectorRef,
  ) {
    const actualResults = [];
    const stepResults = [];
    itc.testStepsWithResults.forEach((stepWResult: TestStepWithResult) => {
      actualResults.push(stepWResult.actualResultMarkup);
      stepResults.push(stepWResult.result);
    });
    const testCase = {
      task_id: Utils.uri2id(testRun.testRun.uri),
      editedTestRunId: Utils.uri2id(itc.childTestRun.uri),
      actualResults,
      stepResult: stepResults,
      uploadConversationId: conversationId,
      defaultResult: null,
      conclusion: testRun.conclusion,
      endRunComment: 'CUSTOM',
      // enum: NEW, SUSPENDED, IN_PROGRESS, COMPLETED
      endRunStatus: testRun.childTestRunStatus || 'COMPLETED',
      endRunResult: null,
      pauseRun: false,
      timeSpent: itc.runTime
    };
    const response = await this.appService.post('rest/testRunner/saveTestRun', testCase);
    if (response instanceof ErrorVO) {
      const errorMessage = 'Failed to upload test run data to the server!';
      this.logger.err(errorMessage);
      await this.appService.notifyUserAboutError(errorMessage, true);
    }
    await this.uploadReportedBugs(itc, changeDetector);
  }

  /**
   * Starts or stops the upload process.
   */
  toggleUpload() {
    if (this.res.isUploading()) {
      this.res.pause();
    } else {
      this.res.upload();
    }
  }

  private async deviceAlert(title: string, subtitle: string) {
    const alert = await this.alertCtrl.create({
      header: title,
      subHeader: subtitle,
      buttons: ['OK']
    });
    alert.present().then();
  }

  private uploadReportedBugs(itc: InitializedTestCase, changeDetector: ChangeDetectorRef): Promise<any> {
    const promises = [];
    if (itc.bugs && itc.bugs.length) {
      itc.bugs.forEach(bug => {
        const uploadBug = Object.assign({}, bug);
        if (_.has(uploadBug, 'uploadProgress')) {
          delete uploadBug.uploadProgress;
        }
        promises.push(
          this.appService.post('rest/item', uploadBug).then(response => {
            if (response instanceof ErrorVO) {
              const errorMessage = 'Failed to upload a bug to the server!';
              this.logger.err(errorMessage);
              return this.appService.notifyUserAboutError(errorMessage, true);
            } else {
              bug.uploadProgress = 100;
              changeDetector.detectChanges();
              return this.appService.post('rest/association', {
                from: itc.testCaseTrackerItem.uri,
                to: response.uri,
                type: '/association/type/superordinate to',
                propagatingSuspects: true,
                description: 'Reported bug',
                descFormat: 'Plain'
              }).then(assocResponse => {
                if (assocResponse instanceof ErrorVO) {
                  const errorMessage = 'Failed to associate a bug with the test case!';
                  this.logger.err(errorMessage);
                  return this.appService.notifyUserAboutError(errorMessage, true);
                }
              });
            }
          })
        );
      });
    }
    return Promise.all(promises);
  }

  private initResumableUploader(conversationId: string) {
    this.res = new Resumable({
      target: this.appService.base + '/rest/resumableUploadServlet',
      chunkSize: 1 * 1024 * 1024, // 1MB
      simultaneousUploads: 4,
      testChunks: true,
      // throttleProgressCallbacks: 1,
      method: 'octet',
      headers: {
        Authorization: 'Bearer ' + this.appService.token
      },
      query: {
        conversationId
      }
    });
    this.res.on('fileAdded', resumableFile => {
      this.fileAdded.next(resumableFile);
      this.res.upload();
    });
    this.res.on('pause', () => {
      // Show resume, hide pause
      this.pause.next();
    });
    this.res.on('complete', () => {
      // Hide pause/resume when the upload has completed
      this.complete.next();
    });
    this.res.on('fileSuccess', (resumableFile, message) => {
      // Reflect that the file upload has completed
      this.fileSuccess.next({file: resumableFile, message});
    });
    this.res.on('fileError', (resumableFile, message) => {
      // Reflect that the file upload has resulted in error
      this.fileError.next({file: resumableFile, message});
    });
    this.res.on('progress', () => {
      this.progress.next();
    });
    this.res.on('fileProgress', (resumableFile) => {
      // Handle progress for both the file and the overall upload
      this.fileProgress.next(resumableFile);
    });
  }

}
