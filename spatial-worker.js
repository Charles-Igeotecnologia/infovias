// Cálculo geométrico isolado para manter controles e mapa responsivos.
importScripts('https://unpkg.com/@turf/turf@6.5.0/turf.min.js');
self.onmessage = ({data}) => {
    try {
        const combined = turf.combine(data.lines).features[0];
        const result = turf.buffer(combined, data.radius, {units: 'kilometers'});
        if (!result) throw new Error('Não foi possível construir a área de influência.');
        self.postMessage({result});
    } catch (error) {
        self.postMessage({error: error.message});
    }
};
