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
import {ModalController, NavParams, ToastController} from '@ionic/angular';
import {InitializedTestCase} from '../../../../../../models/initialized-test-case';
import {Utils} from '../../../../../../utils/utils';
import {TrackerItemModel} from '../../../../../../models/tracker-item.model';
import {StorageService} from '../../../../../../services/storage.service';
import {ProjectWithBugTrackers} from '../../../../../../models/project-with-bug-trackers';
import {TrackerWithNewItemSchema} from '../../../../../../models/tracker-with-new-item-schema';
import {EventService} from '../../../../../../services/event.service';

@Component({
  selector: 'page-report-bug',
  templateUrl: 'report-bug.html',
  styleUrls: ['./report-bug.scss']
})
export class ReportBugPage {

  testCase: InitializedTestCase;
  bug: TrackerItemModel;

  projectTrackerInfo: ProjectWithBugTrackers[] = [];

  summary: string;
  description: string;

  selectedProject: ProjectWithBugTrackers;
  selectedTracker: TrackerWithNewItemSchema;

  missingRequiredFieldWarningMessage = '';

  constructor(public navParams: NavParams,
              public toastCtrl: ToastController,
              private storageService: StorageService,
              private eventService: EventService,
              private modalCtrl: ModalController) {
    this.initialize();
  }

  ionViewWillEnter() {
    this.bug = new TrackerItemModel();
  }

  async closeModal() {
    await this.modalCtrl.dismiss();
  }

  async addBug() {
    this.bug.name = this.summary;
    this.bug.description = this.description;

    this.bug.detectedIn = [this.testCase.childTestRun.versions];
    this.bug.uploadProgress = 0;

    this.testCase.bugs = this.testCase.bugs || [];
    this.testCase.bugs.push(this.bug);
    this.eventService.publish('bug:reported');
    await this.modalCtrl.dismiss();
    const toast = await this.toastCtrl.create({
      message: 'The bug has been successfully reported!',
      duration: 4000
    });
    await toast.present();
  }

  checkMissingRequiredField() {
    this.bug = new TrackerItemModel();
    if (this.selectedTracker && this.selectedTracker.newItemSchema) {
      this.bug = this.selectedTracker.newItemSchema.item;
      const additionalRequiredFields = this.selectedTracker.newItemSchema.type.required
        .filter((fieldName: string) => fieldName !== 'name' && fieldName !== 'description');
      if (additionalRequiredFields && additionalRequiredFields.length) {
        const requiredFieldNamesWithoutDefaultValue = additionalRequiredFields.filter((fieldName: string) => !this.bug[fieldName]);
        if (requiredFieldNamesWithoutDefaultValue && requiredFieldNamesWithoutDefaultValue.length) {
          if (requiredFieldNamesWithoutDefaultValue.length === 1) {
            this.missingRequiredFieldWarningMessage = `There is a required field '${requiredFieldNamesWithoutDefaultValue[0]}'`
              + ` without default value that cannot be filled in this form!`;
          } else {
            this.missingRequiredFieldWarningMessage = `There are some required fields '${requiredFieldNamesWithoutDefaultValue.join(', ')}'`
              + ` without default value that cannot be filled in this form!`;
          }
          return;
        }
      }
    }
    this.missingRequiredFieldWarningMessage = '';
  }

  private initialize() {
    this.testCase = this.navParams.get('testCase');
    this.preFillBugReportForm().then();
    this.checkMissingRequiredField();
  }

  private async preFillBugReportForm() {
    this.projectTrackerInfo = await this.storageService.getBugTrackerInfoForMultipleProjects();

    const savedProject = await this.storageService.getSavedProject();
    const foundProject = this.projectTrackerInfo.find(info =>
      +Utils.uri2id(info.project.uri) === +Utils.uri2id(savedProject.uri)
    );
    if (foundProject) {
      this.selectedProject = foundProject;
      if (this.selectedProject.bugTrackers && this.selectedProject.bugTrackers.length) {
        this.selectedTracker = this.selectedProject.bugTrackers[0];
      }
    }
  }

}
