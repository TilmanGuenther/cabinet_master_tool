/**
 * Cabinet type definitions.
 *
 * To add a new brand or series:
 *  1. Add a new entry to CABINET_TYPES below.
 *  2. Set a unique `id` string — this is stored in saved configs, so once
 *     published it must not change (treat it as a stable key).
 *  3. Fill in the physical constants for that drawer system.
 *
 * ---
 * Field reference:
 *
 *  id                       Unique key. Stored in the config JSON as
 *                           `cabinet.cabinetType`. Use snake_case, e.g.
 *                           "vidmar_4in" or "lista_75".
 *
 *  brand                    Manufacturer name shown in the type selector.
 *
 *  description              Short human-readable description, e.g. the series
 *                           name or a key distinguishing feature.
 *
 *  defaultInnerWidthMM      Pre-filled inner-width value when the user creates
 *                           a new cabinet of this type. Override freely.
 *
 *  defaultInnerDepthMM      Pre-filled inner-depth value. Override freely.
 *
 *  drawerFrontHeights       Array of available drawer front-panel heights
 *                           (mm). These are the catalogue sizes sold by the
 *                           manufacturer and shown in the height selector.
 *
 *  defaultDrawerFrontHeight Which height from drawerFrontHeights is
 *                           pre-selected when adding a new drawer.
 *
 *  heightMarginMM           Millimetres subtracted from the front-panel
 *                           height to get the usable interior height.
 *                           Accounts for the drawer base plate, slide
 *                           mechanism clearance, etc.
 *                           Formula: usableInnerHeight = frontHeight − heightMarginMM
 * ---
 */
export const CABINET_TYPES = {

  lista_75: {
    id: 'lista_75',
    brand: 'LISTA',
    description: 'LISTA (standard series)',
    defaultInnerWidthMM: 565,
    defaultInnerDepthMM: 574,
    drawerFrontHeights: [50, 75, 100, 125, 150, 200, 250, 300],
    defaultDrawerFrontHeight: 75,
    heightMarginMM: 17.5,
  },

  // ── Add further cabinet types below ─────────────────────────────────────────
  //
  // Example (uncomment and fill in real values):
  //
  // vidmar_4in: {
  //   id: 'vidmar_4in',
  //   brand: 'Vidmar',
  //   description: 'Vidmar (4-inch series)',
  //   defaultInnerWidthMM: 558,
  //   defaultInnerDepthMM: 558,
  //   drawerFrontHeights: [101, 152, 203, 254],
  //   defaultDrawerFrontHeight: 101,
  //   heightMarginMM: 20,
  // },

}

/** ID of the type used when no type is specified (new installs, legacy configs). */
export const DEFAULT_CABINET_TYPE = 'lista_75'

/**
 * Returns the type spec for a given id.
 * Falls back to the default if the id is unknown or missing, so legacy configs
 * (saved before cabinet types existed) continue to work correctly.
 *
 * @param {string|undefined} typeId
 * @returns {object} cabinet type spec
 */
export function getCabinetType(typeId) {
  return CABINET_TYPES[typeId] ?? CABINET_TYPES[DEFAULT_CABINET_TYPE]
}
