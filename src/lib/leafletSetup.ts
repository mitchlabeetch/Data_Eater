import L from 'leaflet';

// Configuration for default marker icons in Leaflet + Webpack/Vite
// This resolves an issue where Leaflet fails to detect image paths in bundlers
// See: https://github.com/Leaflet/Leaflet/issues/4968
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Prevents Leaflet from trying to detect the path automatically which fails in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
});
