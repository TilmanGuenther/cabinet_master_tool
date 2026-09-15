/**
 * Returns a fresh sample config for first-time use / demo.
 * This is the canonical reference for the config JSON schema.
 */
export function createSampleConfig() {
  return {
    cabinets: [
      {
        id: 'cabinet-1',
        name: 'Workshop Cabinet',
        cabinetType: 'lista_75',
        innerWidthMM: 565,
        innerDepthMM: 574,
        totalFrontHeightMM: 1200,
        gridW: 13,  // floor((565 - 5) / 42)
        gridH: 13,  // floor((574 - 5) / 42)
        labelSheet: {
          columns: 3,
          rows: 7,
          widthMM: 63.5,
          heightMM: 38.1,
          preset: 'Avery L7160',
        },
        drawers: [
          {
            id: 'drawer-1',
            order: 0,
            label: 'M3 Screws',
            frontHeight: 75,
            usableInnerHeight: 57.5,
            maxHeightUnits: 8,
            color: '#f5c842',
            gridW: 13,
            gridH: 13,
            bins: [
              {
                id: 'bin-m3x6',
                x: 0, y: 0, w: 2, h: 1,
                heightUnits: 6,
                part: {
                  description: 'M3x6 Socket Head Torx',
                  standard: 'DIN 912',
                  bossardPN: '1127950',
                  thread: 'M3',
                  length: 6,
                  drive: 'Torx',
                  headType: 'socket',
                },
              },
              {
                id: 'bin-m3x10',
                x: 2, y: 0, w: 2, h: 1,
                heightUnits: 6,
                part: {
                  description: 'M3x10 Socket Head Torx',
                  standard: 'DIN 912',
                  bossardPN: '1127952',
                  thread: 'M3',
                  length: 10,
                  drive: 'Torx',
                  headType: 'socket',
                },
              },
              {
                id: 'bin-m3x16',
                x: 4, y: 0, w: 2, h: 1,
                heightUnits: 6,
                part: {
                  description: 'M3x16 Socket Head Torx',
                  standard: 'DIN 912',
                  bossardPN: '1127956',
                  thread: 'M3',
                  length: 16,
                  drive: 'Torx',
                  headType: 'socket',
                },
              },
            ],
          },
          {
            id: 'drawer-2',
            order: 1,
            label: 'M4 Screws & Nuts',
            frontHeight: 100,
            usableInnerHeight: 82.5,
            maxHeightUnits: 11,
            color: '#ef4444',
            gridW: 13,
            gridH: 13,
            bins: [
              {
                id: 'bin-m4x10',
                x: 0, y: 0, w: 3, h: 1,
                heightUnits: 6,
                part: {
                  description: 'M4x10 Socket Head Torx',
                  standard: 'DIN 912',
                  bossardPN: '',
                  thread: 'M4',
                  length: 10,
                  drive: 'Torx',
                  headType: 'socket',
                },
              },
            ],
          },
        ],
      },
    ],
  }
}
