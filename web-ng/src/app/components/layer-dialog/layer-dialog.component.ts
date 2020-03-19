/**
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Component, Inject, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { ProjectService } from '../../services/project/project.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Project } from '../../shared/models/project.model';
import { Layer } from '../../shared/models/layer.model';
import { Form } from '../../shared/models/form/form.model';
import { Subscription } from 'rxjs';
import { DataStoreService } from '../../services/data-store/data-store.service';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { FieldType } from '../../shared/models/form/field.model';
import { StringMap } from '../../shared/models/string-map.model';
import { Map } from 'immutable';

@Component({
  selector: 'app-layer-dialog',
  templateUrl: './layer-dialog.component.html',
  styleUrls: ['./layer-dialog.component.css'],
})
export class LayerDialogComponent implements OnDestroy {
  lang: string;
  layerId: string;
  layer?: Layer;
  layerName!: string;
  projectId?: string;
  activeProject$: Observable<Project>;
  subscription: Subscription = new Subscription();
  layerForm: FormGroup;

  constructor(
    // tslint:disable-next-line:no-any
    @Inject(MAT_DIALOG_DATA) data: any,
    private dialogRef: MatDialogRef<LayerDialogComponent>,
    private projectService: ProjectService,
    private dataStoreService: DataStoreService,
    private router: Router,
    private formBuilder: FormBuilder
  ) {
    this.lang = 'en';
    // Disable closing on clicks outside of dialog.
    dialogRef.disableClose = true;
    this.layerId = data.layerId;
    this.activeProject$ = this.projectService.getActiveProject$();
    this.layerForm = this.formBuilder.group({
      question: [''],
    });
    this.subscription.add(
      this.activeProject$.subscribe(project => {
        this.onProjectLoaded(project);
      })
    );
  }

  onProjectLoaded(project: Project) {
    if (this.layerId === ':new') {
      this.layerId = this.dataStoreService.generateId();
      this.layer = {
        id: this.layerId,
      };
    } else {
      this.layer = project.layers.get(this.layerId);
    }
    this.layerName = this.layer?.name?.get(this.lang) || '';

    if (!this.layer) {
      throw Error('No layer exists');
    }
    this.projectId = project.id;
  }

  // TODO: Make getForm accomodate multiple fields
  getForm(question: string, fieldId: string, formId: string): Form {
    const form = {
      id: formId,
      fields: Map({
        [fieldId]: {
          id: fieldId,
          type: FieldType['TEXT'],
          required: false,
          label: StringMap({
            en: question,
          }),
        },
      }),
    };
    return form;
  }

  onSave() {
    // TODO: Wait for project to load before showing dialog.
    if (!this.projectId) {
      throw Error('Project not yet loaded');
    }
    const formId = this.dataStoreService.generateId();
    const fieldId = this.dataStoreService.generateId();
    const layer = new Layer(
      this.layerId,
      this.layer?.color,
      this.layer?.name?.set(this.lang, this.layerName),
      this.layerForm.value.question
        ? Map({
            [formId]: this.getForm(
              this.layerForm.value.question,
              fieldId,
              formId
            ),
          })
        : undefined
    );

    // TODO: Inform user layer was saved
    this.dataStoreService
      .updateLayer(this.projectId, layer)
      .then(() => this.onClose())
      .catch(err => {
        alert('Layer update failed.');
      });
  }

  onClose() {
    this.dialogRef.close();
    // TODO: refactor this path into a custom router wrapper
    return this.router.navigate([`p/${this.projectId}`]);
  }

  setLayerName(value: string) {
    this.layerName = value;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
