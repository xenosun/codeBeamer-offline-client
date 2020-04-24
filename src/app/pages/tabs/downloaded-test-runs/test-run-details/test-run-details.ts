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

import {AfterViewInit, Component, OnDestroy, ViewChild} from '@angular/core';
import {AlertController, LoadingController, NavController} from '@ionic/angular';
import {DownloadedTestRun} from '../../../../models/downloaded-test-run';
import {InitializedTestCase} from '../../../../models/initialized-test-case';
import {StorageService} from '../../../../services/storage.service';
import {TestRunStatus} from '../../../../models/test-run-status';
import {TestRunResult} from '../../../../models/test-run-result';
import {ActivatedRoute, Router} from '@angular/router';
import * as _ from 'lodash';
import {EventService} from '../../../../services/event.service';
import {TestRunData} from '../../../../services/test-run-detail-resolver.service';
import {AppService} from '../../../../services/app.service';
import {LogProvider} from '../../../../services/ionic-log-file-appender/log.service';

@Component({
  selector: 'page-test-run-details',
  templateUrl: 'test-run-details.html',
  styleUrls: ['./test-run-details.scss']
})
export class TestRunDetailsPage implements AfterViewInit, OnDestroy {

  @ViewChild('slides', {static: true}) slides: any;

  testRun: DownloadedTestRun;
  testCaseIndex = 0;

  swiper: any; // Swiper

  constructor(public alertCtrl: AlertController,
              public loadingCtrl: LoadingController,
              private eventService: EventService,
              private storageService: StorageService,
              private navController: NavController,
              private route: ActivatedRoute,
              private router: Router,
              private appService: AppService,
              private logger: LogProvider) {
    this.initialize();
  }

  ngAfterViewInit() {
    this.slides.getSwiper().then(swiper => {
      this.swiper = swiper;
      let slideIndex = this.testCaseIndex;
      if (slideIndex > this.testRun.initializedTestCases.length - 1) {
        slideIndex = this.testRun.initializedTestCases.length - 1;
      }
      // noinspection JSIgnoredPromiseFromCall
      this.swiper.slideTo(slideIndex);
    });
  }

  ionViewWillEnter() {
    this.actualizeTestRunFields();
    this.checkIfTestRunUpdateIsNecessary().then();
  }

  ngOnDestroy() {
    this.eventService.unsubscribe('bug:reported');
  }

  async runTestCase() {
    await this.router.navigate(
      ['../', this.swiper.activeIndex, 'test-runner'],
      {relativeTo: this.route, replaceUrl: true}
      );
  }

  async showBugs() {
    await this.router.navigate(
      ['../', this.swiper.activeIndex, 'reported-bugs'],
      {relativeTo: this.route, replaceUrl: true}
      );
  }

  private initialize() {
    this.route.data.subscribe((data: {testRunDetails: TestRunData}) => {
      this.testRun = data.testRunDetails.testRun;
      this.testCaseIndex = data.testRunDetails.testCaseIndex;
    });
    this.eventService.subscribe('bug:reported', () => {
      this.updateTestRun().then();
    });
  }

  private summarizeTestRun(): { totalRunTime: number, completedTestRuns: number, finished: boolean, failed: boolean } {
    let finished = true;
    let totalRunTime = 0;
    let completedTestRuns = 0;
    let failed = false;
    this.testRun.initializedTestCases.forEach((it: InitializedTestCase) => {
      totalRunTime += it.runTime;
      if (!it.childTestRun.result) {
        finished = false;
      } else {
        if (it.childTestRun.result.id === TestRunResult.FAILED) {
          // failed test case
          failed = true;
        }
        completedTestRuns++;
      }
    });
    return {
      totalRunTime,
      completedTestRuns,
      finished,
      failed
    };
  }

  async navigateBackToDownloadedTestRuns() {
    this.navController.back();
  }

  private actualizeTestRunFields() {
    const summary = this.summarizeTestRun();
    this.testRun.initializedTestRun.totalRunTime = summary.totalRunTime;
    this.testRun.initializedTestRun.completedTestRuns = summary.completedTestRuns;
    if (summary.finished) {
      this.testRun.initializedTestRun.testRunStatus = 'Completed';
      this.testRun.initializedTestRun.testRun.status = {
        id: TestRunStatus.FINISHED,
        name: 'Finished'
      };
      if (summary.failed) {
        this.testRun.initializedTestRun.testRun.result = {
          id: TestRunResult.FAILED,
          name: 'Failed'
        };
      } else {
        this.testRun.initializedTestRun.testRun.result = {
          id: TestRunResult.PASSED,
          name: 'Passed'
        };
      }
    } else {
      if (summary.completedTestRuns === this.testRun.initializedTestRun.leafChildTrackerItems.length) {
        this.testRun.initializedTestRun.testRunStatus = 'Completed';
      } else if (summary.completedTestRuns > 0) {
        this.testRun.initializedTestRun.testRunStatus = 'In Progress';
      }
    }
  }

  private async checkIfTestRunUpdateIsNecessary() {
    const testRun = await this.storageService.getSingleDownloadedTestRun(this.testRun.testRunId);
    if (!_.isEqual(this.testRun, testRun)) {
      await this.updateTestRun();
    }
  }

  private async updateTestRun() {
    const loader = await this.loadingCtrl.create({
      message: 'Updating Stored Test Run',
    });
    await loader.present();
    try {
      await this.storageService.updateDownloadedTestRun(this.testRun);
      await loader.dismiss();
    } catch (err) {
      const errorMessage = 'Failed to update test run in storage!';
      this.logger.err(errorMessage, err);
      await this.appService.notifyUserAboutError(errorMessage);
    }
  }

}
