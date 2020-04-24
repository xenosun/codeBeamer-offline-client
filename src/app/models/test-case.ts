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

export class TestCase {
  id: number;
  uri: string;
  name: string;
  status: any;
  submittedAt: Date;
  modifiedAt: Date;
  preAction: string;
  testSteps: TestStep[];
  postAction: string;
  reusable: boolean;
  description: string;
  descFormat: string;
  comments: any[];

  constructor(obj: any) {
    if (obj) {
      this.id = obj.id || null;
      this.uri = obj.uri || '';
      this.name = obj.name || '';
      this.status = obj.status || null;
      this.submittedAt = obj.submittedAt || null;
      this.modifiedAt = obj.modifiedAt || null;
      this.testSteps = [];
      if (obj.testSteps && obj.testSteps.length) {
        for (let i = 0; obj.testSteps.length; i++) {
          this.testSteps.push(new TestStep(obj.testSteps));
        }
      }
      this.reusable = obj.reusable;
      this.description = obj.description;
      this.descFormat = obj.descFormat;
      this.comments = obj.comments;
    }
  }
}
