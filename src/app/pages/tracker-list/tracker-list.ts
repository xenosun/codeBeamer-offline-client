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
import {LoadingController} from '@ionic/angular';
import {Utils} from '../../utils/utils';
import {TestRunService} from '../../services/test-run.service';
import {TrackerModel} from '../../models/tracker.model';
import {ProjectModel} from '../../models/project.model';
import {StorageService} from '../../services/storage.service';
import {AppService} from '../../services/app.service';
import {Router} from '@angular/router';

@Component({
  selector: 'page-tracker-list',
  templateUrl: 'tracker-list.html',
  styleUrls: ['./tracker-list.scss']
})
export class TrackerListPage {

  project: ProjectModel;
  trackers: TrackerModel[] = [];

  constructor(private appService: AppService,
              private loadingCtrl: LoadingController,
              private testRunService: TestRunService,
              private storageService: StorageService,
              private router: Router) {
    this.initialize().then();
  }

  ionViewWillEnter() {
    this.showTestRunTypeTrackers().then();
  }

  async selectTracker(tracker: TrackerModel) {
    await this.storageService.saveSelectedTracker(tracker);
    await this.router.navigateByUrl(`/project/${Utils.uri2id(this.project.uri)}/tracker/${Utils.uri2id(tracker.uri)}/available-test-runs`);
  }

  async navigateBackToProjectList() {
    await this.router.navigate(['/projects'], {replaceUrl: true});
  }

  private async initialize() {
    this.project = await this.storageService.getSavedProject();
  }

  private async showTestRunTypeTrackers() {
    const loader = await this.loadingCtrl.create({
      message: 'Loading Test Run type Trackers'
    });
    await loader.present();
    this.trackers = await this.testRunService.getTestRunTypeTrackersOfProject(+Utils.uri2id(this.project.uri));
    await loader.dismiss();
  }

}
