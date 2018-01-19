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
  offset: [number, number], // [x, y] in points
  zoomIn: boolean,
  markerImagePath: string,
};

type MapState = {
  bounds: {
    width: number,
    height: number,
  },
};

export default class Map extends Component {
  props: MapProps;
  state: MapState = {
    bounds: {
      width: 320,
      height: 494
    }
  };

  _containerElement: ?HTMLElement;

  componentDidMount() {
    this._updateBounds();
  }

  componentDidUpdate() {
    this._updateBounds();
  }

  shouldComponentUpdate(nextProps: MapProps, nextState: MapState) {
    const { props: oldProps, state: oldState } = this;
    return (
      oldProps.center.some((v, i) => nextProps.center[i] !== v) ||
      oldProps.offset.some((v, i) => nextProps.offset[i] !== v) ||
      oldProps.zoomIn !== nextProps.zoomIn ||
      oldProps.markerImagePath !== nextProps.markerImagePath ||
      ['width', 'height'].some((key) => oldState.bounds[key] !== nextState.bounds[key])
    );
  }

  render() {
    const zoom = this.props.zoomIn ? 2 : 1;

    const projectionConfig = {
      scale: 3000
    };

    const { bounds } = this.state;
    const projection = this._getProjection(bounds.width, bounds.height, projectionConfig);
    const zoomCenter = this._getZoomCenter(this.props.center, this.props.offset, projection, zoom);
    const bbox = this._getBBox(zoomCenter, this.state.bounds, projection, zoom);

    const query = {
      minX: bbox[0], maxX: bbox[2],
      minY: bbox[3], maxY: bbox[1]
    };

    const visibleCountries = countryTree.search(query);
    const visibleCities = cityTree.search(query);

    const mapStyle = {
      width: '100%',
      height: '100%',
      backgroundColor: '#191A1A',
    };

    const defaultGeographyStyle = {
      fill: '#192C44',
      stroke: '#191A1A',
      strokeWidth: '1px',
    };

    const geographyStyle = {
      default: defaultGeographyStyle,
      hover: defaultGeographyStyle,
      pressed: defaultGeographyStyle,
    };

    const zoomStyle = {
      transition: 'transform 1s ease-in-out'
    };

    const defaultMarkerStyle = {
      transition: 'transform 1s ease-in-out',
    };

    const markerStyle = {
      default: defaultMarkerStyle,
      hover: defaultMarkerStyle,
      pressed: defaultMarkerStyle
    };

    const userMarker = (
      <Marker key={ 'pin-marker' }
        marker={{ coordinates: this.props.center }}
        style={ markerStyle }>
        <image x="-30" y="-30" href={ this.props.markerImagePath } />
      </Marker>
    );

    const countryMarkers = visibleCountries.map((item) => (
      <Marker key={ `country-${item.id}` }
        marker={{ coordinates: item.geometry.coordinates }}
        style={ markerStyle }>
        <text fill="rgba(255,255,255,.4)" fontSize="22" textAnchor="middle">
          { item.properties.name }
        </text>
      </Marker>
    ));

    const cityMarkers = visibleCities.map((item) => {
      return (
        <Marker key={ `city-${item.id}` }
          marker={{ coordinates: item.geometry.coordinates }}
          style={ markerStyle }>
          <circle r="2" fill="rgba(255,255,255,.8)" />
          <text x="0" y="-10" fill="rgba(255,255,255,.8)" fontSize="14" textAnchor="middle">
            { item.properties.name }
          </text>
        </Marker>
      );
    });

    return (
      <div ref={ (ref) => this._containerElement = ref } style={{ width: '100%', height: '100%' }}>
        <ComposableMap
          width={ bounds.width }
          height={ bounds.height }
          style={ mapStyle }
          projection={ this._getProjection }
          projectionConfig={ projectionConfig }>
          <ZoomableGroup
            center={ zoomCenter }
            zoom={ zoom }
            disablePanning={ true }
            style={ zoomStyle }>
            <Geographies geography={ geographyData }>
              {(geographies, projection) => geographies.map(geography => (
                <Geography
                  key={ geography.id }
                  geography={ geography }
                  projection={ projection }
                  style={ geographyStyle } />
              ))}
            </Geographies>
            <Markers>
              { [...countryMarkers, ...cityMarkers, userMarker] }
            </Markers>
          </ZoomableGroup>
        </ComposableMap>
      </div>
    );
  }

  _getProjection(width: number, height: number, config: {
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

  _getZoomCenter(
    center: [number, number],
    offset: [number, number],
    projection: ([number, number]) => [number, number],
    zoom: number
  ) {
    const pos = projection(center);
    return projection.invert([
      pos[0] + offset[0] / zoom,
      pos[1] + offset[1] / zoom
    ]);
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
    const containerElement = this._containerElement;
    if(!containerElement) {
      throw new Error('containerElement cannot be null');
    }

    this.setState({
      bounds: {
        width: containerElement.clientWidth,
        height: containerElement.clientHeight
      }
    });
  }
}
