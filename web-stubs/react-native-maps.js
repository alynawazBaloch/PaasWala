// Web stub for react-native-maps
// Maps are not supported on web — this provides no-op components

const React = require('react');
const { View, Text } = require('react-native');

function createNoop(name) {
  const Comp = (props) => React.createElement(View, props?.style ? { style: props.style } : {},
    props?.children || null
  );
  Comp.displayName = name;
  return Comp;
}

module.exports = {
  __esModule: true,
  default: createNoop('MapView'),
  MapView: createNoop('MapView'),
  Marker: createNoop('Marker'),
  Callout: createNoop('Callout'),
  Polyline: createNoop('Polyline'),
  Polygon: createNoop('Polygon'),
  Circle: createNoop('Circle'),
  Overlay: createNoop('Overlay'),
  UrlTile: createNoop('UrlTile'),
  Animated: {
    Marker: createNoop('AnimatedMarker'),
  },
  PROVIDER_DEFAULT: 'default',
  PROVIDER_GOOGLE: 'google',
};
