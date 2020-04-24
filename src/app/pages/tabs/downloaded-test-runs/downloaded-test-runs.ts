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

import {Component} from '@angular/core';
import {AlertController, LoadingController, Platform} from '@ionic/angular';
import {TestRunService} from '../../../services/test-run.service';
import {DownloadedTestRun} from '../../../models/downloaded-test-run';
import {Subscription} from 'rxjs';
import {AppService} from '../../../services/app.service';
import {StorageService} from '../../../services/storage.service';
import {ActivatedRoute, Router} from '@angular/router';
import {NavigateToTrackerListComponent} from '../../../components/navigate-to-tracker-list/navigate-to-tracker-list.component';

@Component({
  selector: 'page-downloaded-test-runs',
  templateUrl: 'downloaded-test-runs.html',
  styleUrls: ['./downloaded-test-runs.scss']
})
export class DownloadedTestRunsPage extends NavigateToTrackerListComponent {

  savedTestRunData: DownloadedTestRun[] = [];
  networkAvailableSub: Subscription;
  online = true;
  offlineLogin = false;

  constructor(private platform: Platform,
              private appService: AppService,
              private testRunService: TestRunService,
              private loadingCtrl: LoadingController,
              private alertCtrl: AlertController,
              public storageService: StorageService,
              private route: ActivatedRoute,
              public router: Router) {
    super(storageService, router);
    this.initialize();
  }

  ionViewWillEnter() {
    this.offlineLogin = this.appService.offlineLoggedIn;
    this.networkAvailableSub = this.appService.networkAvailable.subscribe(available => {
      this.online = available;
    });
  }

  ionViewWillLeave() {
    if (this.networkAvailableSub) {
      this.networkAvailableSub.unsubscribe();
    }
  }

  async removeSavedTestRun(id: number, ev: any) {
    ev.stopPropagation();

    if (this.online) {
      this.removeTestRun(id).then();
    } else {
      const alert = await this.alertCtrl.create({
        header: 'Removing downloaded test run',
        subHeader: 'You are offline, you will not be able to download this test run again. Are you sure you want to remove it?',
        buttons: [{
          text: 'Yes',
          handler: () => {
            this.removeTestRun(id).then();
          }
        }, {
          text: 'No'
        }]
      });
      await alert.present();
    }
  }

  async openTestRunDetails(testRun: DownloadedTestRun) {
    await this.router.navigateByUrl(`/downloaded-test-runs/${testRun.testRunId}/test-run-details/0`);
  }

  logoutFromOffline() {
    this.appService.logout().then();
  }

  private initialize() {
    this.route.data.subscribe((data: {downloadedTestRuns: DownloadedTestRun[]}) => {
      this.savedTestRunData = data.downloadedTestRuns || [];
    });
  }

  private async removeTestRun(id: number) {
    const loader = await this.loadingCtrl.create({
      message: 'Removing test run'
    });
    await loader.present();
    await this.testRunService.deleteDownloadedTestRun(id);
    await loader.dismiss();
    await this.getSavedTestRunData();
  }

  private async getSavedTestRunData() {
    const testRunData = await this.storageService.getDownloadedTestRuns();
    if (testRunData) {
      this.savedTestRunData = testRunData;
    }
  }

}
