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

import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { FeatureService } from '../../services/feature/feature.service';
import { ProjectService } from '../../services/project/project.service';
import { combineLatest } from 'rxjs';
import { Router, ActivatedRoute, NavigationExtras } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'ground-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements AfterViewInit {
  map!: google.maps.Map;
  @ViewChild('map', { static: false }) mapElement!: ElementRef;

  markers: Map<string, google.maps.Marker> = new Map();

  constructor(
    private projectService: ProjectService,
    private featureService: FeatureService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngAfterViewInit() {
    this.addMapsScript();
  }

  addMapsScript() {
    const googleMapsUrl = `http://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}`;
    if (!document.querySelectorAll(`[src="${googleMapsUrl}"]`).length) {
      document.body.appendChild(
        Object.assign(document.createElement('script'), {
          type: 'text/javascript',
          src: googleMapsUrl,
          onload: () => this.initializeMap(),
        })
      );
    } else {
      this.initializeMap();
    }
  }

  initializeMap() {
    const mapOptions: google.maps.MapOptions = {
      center: new google.maps.LatLng(40.767716, -73.971714),
      zoom: 3,
      fullscreenControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      mapTypeId: google.maps.MapTypeId.HYBRID,
    };
    this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);

    this.renderMarkers();
  }

  renderMarkers() {
    combineLatest(
      this.projectService.getActiveProject$(),
      this.featureService.getFeatures$(),
      this.route.fragment
    ).subscribe(([project, features, fragment]) => {
      this.markers.forEach(marker => marker.setMap(null));
      this.markers.clear();

      let focusedFeatureId = '';
      const params = new HttpParams({ fromString: fragment });
      if (params.get('f')) {
        focusedFeatureId = params.get('f')!;
      }

      for (const feature of features) {
        const color = project.layers.get(feature.layerId)!.color || 'red';

        const marker = new google.maps.Marker({
          position: new google.maps.LatLng(
            feature.location.latitude,
            feature.location.longitude
          ),
          map: this.map,
          icon: this.renderIcon(color, feature.id === focusedFeatureId),
        });
        marker.addListener('click', () => {
          // TODO: refactor URL read/write logic into its own service.
          const primaryUrl = this.router
            .parseUrl(this.router.url)
            .root.children['primary'].toString();
          const navigationExtras: NavigationExtras = {
            fragment: `f=${feature.id}`,
          };
          this.router.navigate([primaryUrl], navigationExtras);
        });
        this.markers.set(feature.id, marker);
      }
    });
  }

  renderIcon(color: string, isSelected: boolean): google.maps.Symbol {
    return {
      anchor: new google.maps.Point(7, 20),
      fillColor: color,
      fillOpacity: 1,
      path: `M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,
             1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,
             22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z`,
      scale: isSelected ? 1.5 : 1,
    };
  }
}
