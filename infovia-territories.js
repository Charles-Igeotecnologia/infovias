const InfoviaTerritories = {
  "byState": {
    "AM": [
      "INFOVIA 01 EAD",
      "INFOVIA 02",
      "INFOVIA 04",
      "INFOVIA 05",
      "INFOVIA 06",
      "INFOVIA 07",
      "INFOVIA 08",
      "INFOVIA PAC"
    ],
    "PA": [
      "INFOVIA 00 - RNP",
      "INFOVIA 01 EAD",
      "INFOVIA 03"
    ],
    "AP": [
      "INFOVIA 00 - RNP",
      "INFOVIA 03"
    ],
    "RR": [
      "INFOVIA 04",
      "INFOVIA PAC"
    ]
  },
  "sources": {
    "municipios/municipios_AM.geojson": "8dfee6c365be13a5e0b58290ee7d05e2f816db480290f2d919e1d72c1a515c60",
    "municipios/municipios_PA.geojson": "9b45398d7ada01c912be2e1a24f9b9e843a40b6cedb002e800a14f216d918e82",
    "municipios/municipios_AP.geojson": "1aba195483b5a201f1c7a28aab198a782d390d1c7a283067bbaaa72176f26033",
    "municipios/municipios_RR.geojson": "4f02885bd9e85a527fdd3fb42dfcf8a0d2be1025454e06d94ac01c5068ff6b68",
    "infovias.geojson": "5a1407231b3d147c83b1ed28dc11b22129bab4c650212727de9d84246471246a"
  },
  "method": "Interseção do traçado com a união dos limites municipais da UF, incluindo contato na divisa. Associação espacial na versão local da base; não comprova responsabilidade administrativa."
};
if (typeof module !== "undefined") module.exports = InfoviaTerritories;
