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
import {
  ActionSheetController, AlertController,
  LoadingController,
} from '@ionic/angular';
import {TestRun} from '../../../models/test-run';
import {TestRunService} from '../../../services/test-run.service';
import {Utils} from '../../../utils/utils';
import {DownloadedTestRun} from '../../../models/downloaded-test-run';
import {AppService, ErrorVO} from '../../../services/app.service';
import {Subscription} from 'rxjs';
import {StorageService} from '../../../services/storage.service';
import {ProjectModel} from '../../../models/project.model';
import {TrackerModel} from '../../../models/tracker.model';
import {ActivatedRoute, Router} from '@angular/router';
import {NavigateToTrackerListComponent} from '../../../components/navigate-to-tracker-list/navigate-to-tracker-list.component';
import {TrackerPermission} from '../../../models/tracker-permission';
import {TrackerPermissionIds} from '../../../models/tracker-permission-ids';
import {LogProvider} from '../../../services/ionic-log-file-appender/log.service';

@Component({
  selector: 'page-available-test-runs',
  templateUrl: 'available-test-runs.html',
})
export class AvailableTestRunsPage extends NavigateToTrackerListComponent {

  searchInput = '';
  testRuns: TestRun[] = [];
  filteredTestRuns: TestRun[] = [];

  downloadFinished = 0;
  downloadAll = 0;

  project: ProjectModel;
  tracker: TrackerModel;

  isOnline: boolean;

  networkAvailableSub: Subscription;

  isAnyTestRunReadOnly = false;
  canRunTestsInTracker = true;

  lastLoadedPage = 1;

  constructor(private testRunService: TestRunService,
              public storageService: StorageService,
              private loadingCtrl: LoadingController,
              private appService: AppService,
              private actionSheetCtrl: ActionSheetController,
              private alertCtrl: AlertController,
              private route: ActivatedRoute,
              public router: Router,
              private logger: LogProvider) {
    super(storageService, router);
    this.initialize();
  }

  ionViewWillEnter() {
    this.lastLoadedPage = 1;
    this.networkAvailableSub = this.appService.networkAvailable.subscribe((available: boolean) => {
      this.isOnline = available;
      if (this.isOnline) {
        this.checkTestRunAbilityInTracker().then();
        this.getAvailableTestRuns().then();
        this.testRunService.saveBugTrackerInfoOfAllAvailableProjects().then();
      }
    });
  }

  ionViewWillLeave() {
    if (this.networkAvailableSub) {
      this.networkAvailableSub.unsubscribe();
    }
  }

  refreshTestRuns(event) {
    if (this.isOnline) {
      this.lastLoadedPage = 1;
      this.checkTestRunAbilityInTracker().then();
      this.getAvailableTestRuns(event).then();
    } else {
      event.target.complete();
    }
  }

  onSearch() {
    if (this.searchInput) {
      this.filteredTestRuns = this.testRuns.filter((tr: TestRun) =>
        tr.name.toLowerCase().indexOf(this.searchInput.toLowerCase()) >= 0
      );
    } else {
      this.filteredTestRuns = [...this.testRuns];
    }
    this.checkIfThereIsAnyReadOnlyTestRun();
  }

  clearSelected() {
    this.filteredTestRuns.forEach((tr: TestRun) => tr.selected = false);
  }

  getSelectedTestRuns() {
    if (this.filteredTestRuns) {
      return this.filteredTestRuns.filter((tr: TestRun) => tr.selected);
    }
    return [];
  }

  async downloadSelectedTestRuns() {
    const dlLoader = await this.loadingCtrl.create({
      message: `Downloading ${this.downloadFinished}/${this.downloadAll}`,
    });
    const downloadProcessSub = this.testRunService.downloadProcess.subscribe(() => {
      this.downloadFinished++;
      dlLoader.message = `Downloading ${this.downloadFinished}/${this.downloadAll}`;
    });

    const toDownloadTestRuns = this.getSelectedTestRuns();
    this.downloadAll = toDownloadTestRuns.length;
    this.downloadFinished = 0;
    dlLoader.message = `Downloading ${this.downloadFinished}/${this.downloadAll}`;

    await dlLoader.present();

    try {
      await this.testRunService.downloadTestRuns(toDownloadTestRuns);
      await dlLoader.dismiss();
      this.clearSelected();
      this.getAvailableTestRuns();
    } catch (err) {
      const errorMessage = 'Failed to download test runs!';
      this.logger.err(errorMessage, err);
      await this.appService.notifyUserAboutError(errorMessage);
    }
    downloadProcessSub.unsubscribe();
  }

  async openMenu() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Menu',
      buttons: [{
        text: 'Create Offline Login Code',
        handler: () => {
          this.createOfflineLoginCode();
        }
      }, {
        text: 'Logout',
        role: 'destructive',
        handler: () => {
          this.appService.logout().then();
        }
      }]
    });
    await actionSheet.present();
  }

  async loadNextPage(event) {
    if (!this.isOnline) {
      event.target.complete();
      return;
    }
    try {
      this.lastLoadedPage += 1;
      const nextPageTestRuns = await this.getDisplayableTestRuns();
      if (nextPageTestRuns && nextPageTestRuns.length) {
        this.testRuns = [...this.testRuns, ...nextPageTestRuns];
        this.filteredTestRuns = [...this.testRuns];
        this.checkIfThereIsAnyReadOnlyTestRun();
      } else {
        this.lastLoadedPage -= 1;
        // event.target.disabled = true;
      }
    } catch (err) {
      const errorMessage = 'Failed to load next page of test runs!';
      this.logger.err(errorMessage, err);
      await this.appService.notifyUserAboutError(errorMessage);
    }
    event.target.complete();
    this.onSearch();
  }

  private initialize() {
    this.route.data.subscribe((data: {savedData: {project: ProjectModel, tracker: TrackerModel}}) => {
      this.project = data.savedData.project;
      this.tracker = data.savedData.tracker;
    });
  }

  private async createOfflineLoginCode() {
    const alert = await this.alertCtrl.create({
      header: 'Create Offline Login Code',
      message: 'Enter a code that has at least 7 characters',
      inputs: [{
        name: 'code',
        placeholder: 'Code',
        type: 'password'
      }, {
        name: 'confirmCode',
        placeholder: 'Confirm Code',
        type: 'password'
      }],
      buttons: [{
        text: 'Cancel',
        handler: () => {
        }
      }, {
        text: 'Save',
        handler: data => {
          if (!this.isOfflineCodeFormValid(data)) {
            this.handleFormError(data);
            return;
          }
          this.saveOfflineLoginCode(data.code).then();
        }
      }],
      backdropDismiss: false
    });
    await alert.present();
  }

  private isOfflineCodeFormValid(data: any): boolean {
    return data
      && data.confirmCode
      && data.code
      && data.code.length >= 7
      && data.code === data.confirmCode;
  }

  private async handleFormError(data: any) {
    if (!data.code) {
      const alert = await this.alertCtrl.create({
        header: 'Warning',
        subHeader: 'A code is required!'
      });
      await alert.present();
    } else if (!data.confirmCode) {
      const alert = await this.alertCtrl.create({
        header: 'Warning',
        subHeader: 'Please fill the confirm code as well!'
      });
      await alert.present();
    } else if (data.code !== data.confirmCode) {
      const alert = await this.alertCtrl.create({
        header: 'Warning',
        subHeader: 'Code and confirm code does not match!'
      });
      await alert.present();
    } else if (data.code.length < 7) {
      const alert = await this.alertCtrl.create({
        header: 'Warning',
        subHeader: 'The code is too short!'
      });
      await alert.present();
    }
  }

  private async saveOfflineLoginCode(code: string) {
    const loader = await this.loadingCtrl.create({
      message: 'Saving offline login code'
    });
    await loader.present();
    const offlineLoginData = await this.storageService.getOfflineLoginDataByCode(code);
    if (offlineLoginData) {
      await loader.dismiss();
      const alert = await this.alertCtrl.create({
        header: 'Warning',
        subHeader: 'You already use this code for another server! Please use a different code!'
      });
      await alert.present();
    } else {
      await this.storageService.saveOfflineLoginCodeForCurrentUserOnCurrentServer(code);
      await loader.dismiss();
      const alert = await this.alertCtrl.create({
        header: 'Success',
        subHeader: 'Offline login code has been successfully saved!'
      });
      await alert.present();
    }
  }

  private async getAvailableTestRuns(event?) {
    const trLoader = await this.loadingCtrl.create({
      message: 'Loading Test Runs from Server'
    });
    await trLoader.present();
    try {
      this.testRuns = await this.getDisplayableTestRuns();
      this.filteredTestRuns = [...this.testRuns];
      this.checkIfThereIsAnyReadOnlyTestRun();
    } catch (err) {
      const errorMessage = 'Failed to load test runs from server!';
      this.logger.err(errorMessage, err);
      await this.appService.notifyUserAboutError(errorMessage);
    }

    await trLoader.dismiss();
    if (event) {
      event.target.complete();
    }

    this.onSearch();
  }

  private async getDisplayableTestRuns() {
    const projectId = +Utils.uri2id(this.project.uri);
    const trackerId = +Utils.uri2id(this.tracker.uri);

    const testRuns: TestRun[] = await this.testRunService.getTestRuns(projectId, trackerId, this.lastLoadedPage);

    const downloadMarkedTestRuns = await this.markDownloadedTestRuns(testRuns);
    return await this.markNonEditableTestRuns(downloadMarkedTestRuns);
  }

  private async markDownloadedTestRuns(testRunsFromServer: TestRun[]): Promise<TestRun[]> {
    const downloadedTestRuns: DownloadedTestRun[] = await this.storageService.getDownloadedTestRuns();

    return testRunsFromServer.map((tr: TestRun) => {
      let downloaded = false;
      if (downloadedTestRuns) {
        downloaded = !!downloadedTestRuns.find(downloadedTestRun =>
          downloadedTestRun.testRunId === +Utils.uri2id(tr.uri)
        );
      }
      const extended = {
        id: +Utils.uri2id(tr.uri),
        selected: false,
        downloaded,
      };
      return Object.assign({}, tr, extended);
    });
  }

  private async markNonEditableTestRuns(testRunsFromServer: TestRun[]): Promise<TestRun[]> {
    const editableTestRuns = await this.filterEditableTestRuns(testRunsFromServer);

    return testRunsFromServer.map((tr: TestRun) => {
      let editable = false;
      if (editableTestRuns) {
        editable = !!editableTestRuns.find(editableTestRun =>
          editableTestRun.uri === tr.uri
        );
      }
      const extended = {editable};
      return Object.assign({}, tr, extended);
    });
  }

  private filterEditableTestRuns(testRunsFromServer: TestRun[]): Promise<TestRun[]> {
    return Promise.all(
      testRunsFromServer.map((tr: TestRun) =>
        this.appService.get(`rest/item/${Utils.uri2id(tr.uri)}/edit`)
          .then(response => {
            if (response instanceof ErrorVO) {
              return null;
            }
            return tr;
          })
          .catch(err => null)
      )
    ).then(results => results.filter(res => !!res));
  }

  private checkIfThereIsAnyReadOnlyTestRun() {
    this.isAnyTestRunReadOnly = !!this.filteredTestRuns.find((tr: TestRun) => !tr.editable);
  }

  private async checkTestRunAbilityInTracker() {
    const trackerId = Utils.uri2id(this.tracker.uri);
    const userId = Utils.uri2id(this.appService.currentUser.uri) || this.appService.currentUser.id;
    const response: TrackerPermission[] | ErrorVO = await this.appService.get(`rest/tracker/${trackerId}/user/${userId}/permissions`);
    if (response instanceof ErrorVO) {
      this.canRunTestsInTracker = false;
      return;
    }
    this.canRunTestsInTracker = !!response
      .find((tp: TrackerPermission) => tp.id === TrackerPermissionIds.issue_add)
      && !!response.find((tp: TrackerPermission) =>
        tp.id === TrackerPermissionIds.issue_edit || tp.id === TrackerPermissionIds.issue_edit_not_own);
  }
}
