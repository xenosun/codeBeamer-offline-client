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

import {TestStep} from './test-step';

export class TestRun {
  id: number;
  uri: string;
  name: string;
  testConfiguration: any;
  status: any;
  result: any;
  versions: any;
  submittedAt: Date;
  modifiedAt: Date;
  spentMillis: number;
  children: any[];
  description: string;
  descFormat: string;
  comments: any[];
  testCases: any[];
  // only in child test run
  testStepResults: TestStep[];

  // extra fields
  selected: boolean;
  downloaded: boolean;
  editable: boolean;

  constructor(obj: any) {
    if (obj) {
      this.id = obj.id || null;
      this.uri = obj.uri || '';
      this.name = obj.name || '';
      this.testConfiguration = obj.testConfiguration || null;
      this.status = obj.status || null;
      this.result = obj.result || null;
      this.versions = obj['versions'] || null;
      this.submittedAt = obj.submittedAt || null;
      this.modifiedAt = obj.modifiedAt || null;
      this.spentMillis = obj.spentMillis || 0;
      this.children = obj.children || [];
      this.description = obj.description || '';
      this.descFormat = obj.descFormat || '';
      this.comments = obj.comments || [];
      this.testCases = obj.testCases || [];
      this.testStepResults = [];
      if (obj.testStepResults && obj.testStepResults.length) {
        for (let i = 0; i <= obj.testStepResults.length; i++) {
          this.testStepResults.push(new TestStep(obj.testStepResults));
        }
      }
      this.selected = obj.selected || false;
    }
  }
}
