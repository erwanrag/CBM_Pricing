// src/constants/routes.js
const ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  alertes: "/alertes",
  compare: "/compare-tarif",
  modifications: "/modifications",
  parametres: "/parametres",
};

const ROUTE_TITLES = {
  [ROUTES.alertes]: "Alertes",
  [ROUTES.dashboard]: "Analyse Produit",
  [ROUTES.modifications]: "Modifications tarif",
  [ROUTES.compare]: "Comparatif Tarif",
  [ROUTES.parametres]: "Paramètres",
};

export { ROUTES, ROUTE_TITLES };
