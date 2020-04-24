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
import {TestRunService} from '../../services/test-run.service';
import {ProjectModel} from '../../models/project.model';
import {StorageService} from '../../services/storage.service';
import {AppService} from '../../services/app.service';
import {Router} from '@angular/router';
import {Utils} from '../../utils/utils';

@Component({
  selector: 'page-project-list',
  templateUrl: 'project-list.html',
  styleUrls: ['./project-list.scss']
})
export class ProjectListPage {

  projects: ProjectModel[] = [];

  constructor(private appService: AppService,
              private loadingCtrl: LoadingController,
              private testRunService: TestRunService,
              private storageService: StorageService,
              private router: Router) {
  }

  ionViewWillEnter() {
    this.showAvailableProjects().then();
  }

  async selectProject(project: ProjectModel) {
    await this.storageService.saveSelectedProject(project);
    await this.router.navigateByUrl(`/project/${Utils.uri2id(project.uri)}/trackers`);
  }

  async logout() {
    await this.appService.logout();
  }

  private async showAvailableProjects() {
    const loader = await this.loadingCtrl.create({
      message: 'Loading Projects'
    });
    await loader.present();
    this.projects = await this.testRunService.getProjectsOfCurrentUser();
    await loader.dismiss();
  }

}
