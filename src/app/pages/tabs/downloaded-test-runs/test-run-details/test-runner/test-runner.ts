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

import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {
  AlertController, IonSlides,
  LoadingController,
  ModalController, NavController,
  Platform,
} from '@ionic/angular';
import {
  File as IonicFile,
} from '@ionic-native/file/ngx';
import {Utils} from '../../../../../utils/utils';
import {DownloadedTestRun} from '../../../../../models/downloaded-test-run';
import {InitializedTestCase} from '../../../../../models/initialized-test-case';
import {TestStepWithResult} from '../../../../../models/test-step-with-result';
import {UploadFile} from '../../../../../models/upload-file';
import {Result} from '../../../../../models/result';
import {UploadService} from '../../../../../services/upload.service';
import {ReportBugPage} from './report-bug/report-bug';
import {PlatformType} from '../../../../../models/platform-type';
import {TestRunResult} from '../../../../../models/test-run-result';
import {TestRunStatus} from '../../../../../models/test-run-status';
import {FileSystemService} from '../../../../../services/file-system.service';
import * as XRegExp from 'xregexp';
import {ActivatedRoute, Router} from '@angular/router';
import {StorageService} from '../../../../../services/storage.service';
import {WebView} from '@ionic-native/ionic-webview/ngx';
import {TestRunData} from '../../../../../services/test-run-detail-resolver.service';
import {AppService} from '../../../../../services/app.service';
import {LogProvider} from '../../../../../services/ionic-log-file-appender/log.service';

@Component({
  selector: 'page-test-runner',
  templateUrl: 'test-runner.html',
  styleUrls: ['./test-runner.scss']
})
export class TestRunnerPage implements AfterViewInit {

  @ViewChild('slides', {static: true}) slides: IonSlides;

  testRun: DownloadedTestRun;
  testRunData: InitializedTestCase;
  indexOfLoadedTestCase: number;

  pauseTimers = false;
  timeSpent = 0;

  swiper: any; // Swiper

  sliderOptions = {
    on: {
      slideChange: () => {
      }
    },
    pagination: {
      el: '.slides-pagination-container',
      type: 'progressbar',
    },
  };

  buttonRowHeight: number;

  constructor(private platform: Platform,
              private alertCtrl: AlertController,
              private file: IonicFile,
              private loadingCtrl: LoadingController,
              private uploadService: UploadService,
              private modalCtrl: ModalController,
              private fileSystemService: FileSystemService,
              private route: ActivatedRoute,
              private router: Router,
              private navController: NavController,
              private storageService: StorageService,
              private webview: WebView,
              private appService: AppService,
              private logger: LogProvider) {
    this.initialize();
  }

  async navigateBackToTestRunDetails() {
    this.finishTestCase(async () => {
      await this.storageService.updateDownloadedTestRun(this.testRun);
      this.navController.setDirection('back', true, 'back');
      await this.router.navigate([
        `/downloaded-test-runs/${this.testRun.testRunId}/test-run-details/${this.indexOfLoadedTestCase}`
      ], {replaceUrl: true});
    });
  }

  ngAfterViewInit() {
    this.slides.getSwiper().then(swiper => {
      this.swiper = swiper;
    });
  }

  async failStep(testStep: TestStepWithResult) {
    testStep.passed = false;
    testStep.result = Result.FAILED;
    testStep.visited = true;
    await this.nextTestStep();
  }

  async passStep(testStep: TestStepWithResult) {
    testStep.passed = true;
    testStep.result = Result.PASSED;
    testStep.visited = true;
    if (testStep.autoCopyExpectedResults && (!testStep.actualResultMarkup || !testStep.actualResultMarkup.trim())) {
      testStep.actualResultMarkup = testStep.expectedResultMarkup;
      testStep.actualResultPreview = testStep.expectedResultPreview;
    }
    await this.nextTestStep();
  }

  async openBugReportModal(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const modal = await this.modalCtrl.create({
      component: ReportBugPage,
      componentProps: {
        testCase: this.testRunData
      },
      backdropDismiss: false
    });
    await modal.present();
  }

  changeTimeSpent(time: number) {
    this.timeSpent = time;
  }

  async finishTestCaseWithoutCompletion(event: MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    await this.finishTestCase(async () => {
      await this.storageService.updateDownloadedTestRun(this.testRun);
      this.navController.back();
    });
  }

  async finishTestCaseAndJumpToNextTestCase(event: MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    await this.finishTestCase(async () => {
      await this.storageService.updateDownloadedTestRun(this.testRun);

      if ((this.indexOfLoadedTestCase + 1) < this.testRun.initializedTestCases.length) {
        await this.jumpToNextTestCase();
      } else {
        this.navController.back();
      }
    });
  }

  toggleTimer(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.pauseTimers = !this.pauseTimers;
  }

  async jumpToNextTestCase() {
    await this.router.navigate([
      'downloaded-test-runs',
      this.testRun.testRunId,
      'test-run-details',
      this.indexOfLoadedTestCase + 1,
      'test-runner'
    ], {replaceUrl: true});
  }

  async onFileChange(step: TestStepWithResult, fileInput: HTMLInputElement) {
    const fileList: FileList = fileInput.files;
    if (fileList.length > 0) {
      const conversationId = Utils.uri2id(this.testRunData.childTestRun.uri) + '_' + this.indexOfLoadedTestCase;
      const file: File = fileList.item(0);
      const fileName = file.name;
      let uniqueFileName = Date.now() + Math.random() + '_';
      uniqueFileName.replace('.', '');
      uniqueFileName += fileName;
      const thumbnail = '[!' + uniqueFileName + '!]';

      if (this.platform.is(PlatformType.CORDOVA)) {
        const loader = await this.loadingCtrl.create({
          message: 'Saving attachment'
        });
        await loader.present();
        const fEntry = await this.fileSystemService.storeFile(this.uploadService.fileStoreDirectory, uniqueFileName, file);
        if (fEntry) {
          const normalizedURL = this.webview.convertFileSrc(fEntry.toURL());
          this.addAttachmentToStep(step, conversationId, file.name, uniqueFileName, file.size, normalizedURL, thumbnail);
        }
        loader.dismiss().then();
      } else {
        this.addAttachmentToStep(step, conversationId, file.name, uniqueFileName, file.size, URL.createObjectURL(file), thumbnail);
      }
    }
  }

  async removeAttachment(fileInput: HTMLInputElement, step: TestStepWithResult, attachment: UploadFile) {
    fileInput.value = null;
    if (this.platform.is(PlatformType.CORDOVA)) {
      await this.removeFile(attachment.path, attachment.fileName);
    } else {
      URL.revokeObjectURL(attachment.imgsrc);
    }
    const index = step.uploads.indexOf(attachment);
    step.uploads.splice(index, 1);
    step.actualResultMarkup = XRegExp.replace(step.actualResultMarkup, attachment.thumbnail, '');
  }

  private initialize() {
    this.route.data.subscribe((data: {testRunDetails: TestRunData}) => {
      this.testRun = data.testRunDetails.testRun;
      this.indexOfLoadedTestCase = data.testRunDetails.testCaseIndex;
      this.testRunData = data.testRunDetails.testCase;
    });
    this.buttonRowHeight = this.platform.height() * 0.1;
  }

  private async confirmTestRunFinish(): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const alert = await this.alertCtrl.create({
        header: 'Finish Test Run',
        subHeader: 'There are incomplete test steps. Are you sure you want to finish the the test?',
        backdropDismiss: false,
        buttons: [{
          text: 'No',
          handler: () => {
            this.jumpToUnfinishedStep();
            resolve(false);
          }
        }, {
          text: 'Yes',
          handler: () => {
            this.testRunData.childTestRun.status = {
              id: TestRunStatus.FINISHED,
              name: 'Finished'
            };
            resolve(true);
          }
        }]
      });
      await alert.present();
    });
  }

  private async finishTestCase(callback: () => Promise<void>) {
    const allTestStepDone = this.isAllTestStepDone();
    if (allTestStepDone) {
      await callback();
    } else {
      const finish = await this.confirmTestRunFinish();
      if (finish) {
        await callback();
      }
    }
  }

  private isAllTestStepDone() {
    this.testRunData.runTime = this.timeSpent;

    // set result and status for this testCase (testRunData.childTestRun)
    const progress = this.collectTestRunProgress();

    if (!progress.finished) {
      return false;
    }

    // only if all finished
    if (progress.failed) {
      this.testRunData.childTestRun.result = {
        id: TestRunResult.FAILED,
        name: 'Failed'
      };
    } else {
      this.testRunData.childTestRun.result = {
        id: TestRunResult.PASSED,
        name: 'Passed'
      };
    }

    this.testRunData.childTestRun.status = {
      id: TestRunStatus.FINISHED,
      name: 'Finished'
    };
    return true;
  }

  private async nextTestStep() {
    if (!this.swiper.isEnd) {
      // noinspection ES6MissingAwait
      this.swiper.slideNext();
    } else {
      await this.navigateBackToTestRunDetails();
    }
  }

  private jumpToUnfinishedStep() {
    const unfinishedStepIndex = this.testRunData.testStepsWithResults
      .findIndex((stepWResult: TestStepWithResult) => !stepWResult.visited);
    if (unfinishedStepIndex) {
      // noinspection JSIgnoredPromiseFromCall
      this.swiper.slideTo(unfinishedStepIndex);
    }
  }

  private addAttachmentToStep(step: TestStepWithResult, conversationId: string, fileName: string, uniqueFileName: string,
                              fileSize: number, previewUrl: string, thumbnail: string) {
    step.uploads = step.uploads || [];
    step.uploads.push({
      conversationId,
      path: this.uploadService.fileStoreDirectory,
      fileName: uniqueFileName,
      visibleFileName: fileName,
      fileSize: Utils.getFileSize(fileSize),
      link: null,
      thumbnail,
      file: null,
      uploadProgress: 0,
      uploaded: false,
      uploadedAt: null,
      imgsrc: previewUrl
    });
    if (Utils.isImageExtension(fileName)) {
      if (!step.actualResultMarkup) {
        step.actualResultMarkup = '';
      }
      step.actualResultMarkup += ' ' + thumbnail;
    }
  }

  private async removeFile(path: string, name: string) {
    if (this.platform.is(PlatformType.CORDOVA)) {
      const errorMessage = 'Failed to remove file!';
      try {
        const removeResult = await this.file.removeFile(path, name);
        if (!removeResult.success) {
          this.logger.err(errorMessage);
          await this.appService.notifyUserAboutError(errorMessage);
        }
      } catch (err) {
        this.logger.err(errorMessage, err);
        await this.appService.notifyUserAboutError(errorMessage);
      }
    }
  }

  private collectTestRunProgress(): { finished: boolean, failed: boolean } {
    let finished = true;
    let failed = false;
    for (const testStepWithResult of this.testRunData.testStepsWithResults) {
      if (!testStepWithResult.visited) {
        finished = false;
        break;
      } else if (!testStepWithResult.passed) {
        failed = true;
      }
    }
    return {
      finished,
      failed
    };
  }
}
