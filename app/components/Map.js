// @flow

import React, { Component } from 'react';
import { ComposableMap, ZoomableGroup, Geographies, Geography, Markers, Marker } from 'react-simple-maps';

import { geoTimes } from 'd3-geo-projection';
import rbush from 'rbush';

import geographyData from '../assets/geo/geometry.json';
import countryTreeData from '../assets/geo/countries.rbush.json';
import cityTreeData from '../assets/geo/cities.rbush.json';

const countryTree = rbush().fromJSON(countryTreeData);
const cityTree = rbush().fromJSON(cityTreeData);

import type { Coordinate2d } from '../types';

export type MapProps = {
  center: Coordinate2d, // longitude, latitude
  zoomIn: boolean,
  markerImagePath: string,
};

export default class Map extends Component {
  props: MapProps;

  state = {
    bounds: {
      width: 320,
      height: 494
    }
  };

  _container: ?HTMLElement;

  componentDidMount() {
    this._updateBounds();
  }

  componentDidUpdate() {
    this._updateBounds();
  }

  render() {
    const zoom = this.props.zoomIn ? 2 : 1;

    const projectionConfig = {
      scale: 3000,
      // doesn't work properly for some reason
      // see: https://github.com/zcreativelabs/react-simple-maps/issues/23
      // yOffset: -62 / zoom
    };

    const { bounds } = this.state;
    const projection = this.getProjection(bounds.width, bounds.height, projectionConfig);

    const mapStyle = {
      width: '100%',
      height: '100%',
      backgroundColor: '#191A1A'
    };

    const defaultGeographyStyle = {
      fill: '#192C44',
      stroke: '#191A1A',
      strokeWidth: '1px',
    };

    const geographyStyle = {
      default: defaultGeographyStyle,
      hover: defaultGeographyStyle,
      pressed: defaultGeographyStyle
    };

    const userMarker = (
      <Marker key={ 'pin-marker' } marker={{ coordinates: this.props.center }}>
        <image x="-30" y="-30" href={ this.props.markerImagePath } />
      </Marker>
    );

    const bbox = this._getBBox(
      this.props.center,
      this.state.bounds,
      projection,
      zoom
    );

    const query = {
      minX: bbox[0],
      maxX: bbox[2],
      minY: bbox[3],
      maxY: bbox[1]
    };

    const visibleCountries = countryTree.search(query);
    const visibleCities = cityTree.search(query);

    const countryMarkers = visibleCountries.map((item) => (
      <Marker key={ `country-${item.id}` } marker={{ coordinates: item.geometry.coordinates }}>
        <text fill="rgba(255,255,255,.4)" fontSize="22" textAnchor="middle">
          { item.properties.name }
        </text>
      </Marker>
    ));

    const cityMarkers = visibleCities.map((item) => {
      return (
        <Marker key={ `city-${item.id}` } marker={{ coordinates: item.geometry.coordinates }}>
          <circle r="2" fill="rgba(255,255,255,.8)" />
          <text x="0" y="-10" fill="rgba(255,255,255,.8)" fontSize="14" textAnchor="middle">
            { item.properties.name }
          </text>
        </Marker>
      );
    });

    return (
      <div ref={ (ref) => this._container = ref } style={{ width: '100%', height: '100%' }}>
        <ComposableMap
          width={ bounds.width }
          height={ bounds.height }
          style={ mapStyle }
          projection={ this.getProjection }
          projectionConfig={ projectionConfig }>
          <ZoomableGroup center={ this.props.center } zoom={ zoom } disablePanning={ true }>
            <Geographies geography={ geographyData }>
              {(geographies, projection) => geographies.map(geography => (
                <Geography
                  key={ geography.id }
                  cacheId={ geography.id }
                  geography={ geography }
                  projection={ projection }
                  style={ geographyStyle } />
              ))}
            </Geographies>
            <Markers>
              { [].concat(countryMarkers, cityMarkers, userMarker) }
            </Markers>
          </ZoomableGroup>
        </ComposableMap>
      </div>
    );
  }

  getProjection(width: number, height: number, config: {
    scale?: number,
    xOffset?: number,
    yOffset?: number,
    rotation?: [number, number, number],
    precision?: number,
  }) {
    const scale = config.scale || 160;
    const xOffset = config.xOffset || 0;
    const yOffset = config.yOffset || 0;
    const rotation = config.rotation || [0, 0, 0];
    const precision = config.precision || 0.1;

    return geoTimes()
      .scale(scale)
      .translate([ xOffset + width / 2, yOffset + height / 2 ])
      .rotate(rotation)
      .precision(precision);
  }

  _getBBox(
    centerCoordinate: [number, number],
    bounds: { width: number, height: number },
    projection: ([number, number]) => [number, number],
    zoom: number
  ) {
    const center = projection(centerCoordinate);
    const halfWidth = bounds.width * 0.5 / zoom;
    const halfHeight = bounds.height * 0.5 / zoom;

    const northWest = projection.invert([center[0] - halfWidth, center[1] - halfHeight]);
    const southEast = projection.invert([center[0] + halfWidth, center[1] + halfHeight]);

    return northWest.concat(southEast);
  }

  _updateBounds() {
    if(!this._container) { return; }

    const width = this._container.clientWidth;
    const height = this._container.clientHeight;
    if(this.state.bounds.width !== width || this.state.bounds.height !== height) {
      this.setState({
        bounds: { width, height }
      });
    }
  }
}
