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

import {ChangeDetectorRef, Component} from '@angular/core';
import {AlertController, NavController} from '@ionic/angular';
import {DownloadedTestRun} from '../../../../models/downloaded-test-run';
import {UploadFile} from '../../../../models/upload-file';
import {InitializedTestCase} from '../../../../models/initialized-test-case';
import {UploadService} from '../../../../services/upload.service';
import {Subscription} from 'rxjs';
import {TestStepWithResult} from '../../../../models/test-step-with-result';
import {AppService} from '../../../../services/app.service';
import {StorageService} from '../../../../services/storage.service';
import {ActivatedRoute, Router} from '@angular/router';
import {TestRunData} from '../../../../services/test-run-detail-resolver.service';
import {LogProvider} from '../../../../services/ionic-log-file-appender/log.service';

@Component({
  selector: 'page-upload-test-run',
  templateUrl: 'upload-test-run.html',
  styleUrls: ['./upload-test-run.scss']
})
export class UploadTestRunPage {

  testRun: DownloadedTestRun;
  uploadsByTestCases: TestCaseWithUploads[] = [];

  fileProgressSub: Subscription;
  fileSuccessSub: Subscription;
  networkAvailableSub: Subscription;

  uploading = false;

  constructor(private navCtrl: NavController,
              private uploadService: UploadService,
              private appService: AppService,
              private alertCtrl: AlertController,
              private route: ActivatedRoute,
              private router: Router,
              private cd: ChangeDetectorRef,
              private storageService: StorageService,
              private logger: LogProvider) {
    this.route.data.subscribe((data: {testRunDetails: TestRunData}) => {
      this.testRun = data.testRunDetails.testRun;
    });
    this.networkAvailableSub = this.appService.networkAvailable.subscribe((available: boolean) => {
      if (!available) {
        this.navCtrl.back();
      }
    });
  }

  ionViewWillEnter() {
    this.uploadsByTestCases = [];
    this.testRun.initializedTestCases.forEach((itc: InitializedTestCase) => {
      const uploads = [];
      let conversationId = null;
      itc.testStepsWithResults.forEach((step: TestStepWithResult) => {
        if (step.uploads && step.uploads.length) {
          if (!conversationId) {
            conversationId = step.uploads[0].conversationId;
          }
          uploads.push(...step.uploads);
        }
      });
      this.uploadsByTestCases.push({
        testCase: itc,
        uploads,
        reportedBugs: itc.bugs,
        uploadAvailable: false,
        conversationId
      });
    });
  }

  ionViewWillLeave() {
    if (this.fileProgressSub) {
      this.fileProgressSub.unsubscribe();
    }
    if (this.fileSuccessSub) {
      this.fileSuccessSub.unsubscribe();
    }
    if (this.networkAvailableSub) {
      this.networkAvailableSub.unsubscribe();
    }
  }

  private async uploadTestCaseData(tcwu: TestCaseWithUploads) {
    await this.uploadService.uploadTestCaseData(this.testRun.initializedTestRun, tcwu.testCase, tcwu.conversationId, this.cd);
    if (!tcwu.testCase.uploadedAt) {
      tcwu.testCase.uploadedAt = new Date();
    }
    await this.storageService.updateDownloadedTestRun(this.testRun);
  }

  async uploadAll() {
    this.uploading = true;
    for (const testCaseUpload of this.uploadsByTestCases) {
      await this.uploadTestCase(testCaseUpload);
    }

    this.testRun.uploaded = true;
    await this.storageService.updateDownloadedTestRun(this.testRun);

    const alert = await this.alertCtrl.create({
      header: 'Upload finished',
      subHeader: 'All files and test cases has been uploaded!',
      cssClass: 'success-alert'
    });
    await alert.present();

    this.uploading = false;
  }

  private async uploadTestCase(testCaseUpload: TestCaseWithUploads) {
    try {
      for (const upload of testCaseUpload.uploads) {
        await this.uploadFile(upload);
      }
    } catch (err) {
      const errorMessage = 'Failed to upload a file to the server!';
      this.logger.err(errorMessage, err);
      await this.appService.notifyUserAboutError(errorMessage, true);
    }

    await this.uploadTestCaseData(testCaseUpload);
  }

  private uploadFile(upload: UploadFile) {
    return new Promise((resolve, reject) => {
      const progressSub = this.uploadService.fileProgress.subscribe(file => {
        upload.uploadProgress = Math.round(file.progress() * 100);
        this.cd.detectChanges();
      });
      const successSub = this.uploadService.fileSuccess.subscribe(value => {
        progressSub.unsubscribe();
        successSub.unsubscribe();
        failedSub.unsubscribe();
        resolve();
      });
      const failedSub = this.uploadService.fileError.subscribe(value => {
        progressSub.unsubscribe();
        successSub.unsubscribe();
        failedSub.unsubscribe();
        reject();
      });

      this.uploadService.upload(upload);
    });
  }

}

export interface TestCaseWithUploads {
  testCase: InitializedTestCase;
  uploads: UploadFile[];
  reportedBugs: any[];
  uploadAvailable: boolean;
  conversationId: string;
}
