window.SignalMaker = {
  dimensions: {
    housing: {
      8: { width: 10, height: 10, depth: 6.625, faceWidth: 9.3 },
      12: { width: 15.25, height: 14, depth: 7.75, faceWidth: 14 },
    },
    arrow: { armLength: 6.75, stroke: 0.94, height: 10, shaftTop: -1, shaftBottom: 5 },
    uTurn: {
      referenceDiameter: 17.078, width: 13.652507, height: 11.783714, stroke: 1.395,
      path: 'M-6.8749 -0.2696 L-1.7009 4.9044 L3.4731 -0.2696 '
        + 'M-1.7011 1.3946 L-1.7011 -1.5484 C-1.7011 -3.5624 -0.0691 -5.1954 1.9419 -5.1954 '
        + 'C3.9559 -5.1954 5.5869 -3.5624 5.5869 -1.5484 L5.5869 3.1736',
    },
    bicycle: { width: 9, height: 5, wheelOuterRadius: 1.6875, stroke: 0.3125 },
    bus: { referenceDiameter: 44, length: 30.668, width: 6.666 },
    mast: {
      minLength: 120, maxLength: 936, defaultLength: 480, taperPerFoot: 0.14,
      minBowWidth: 12, bowTransitionLength: 48, bowTransitionRatio: 0.2,
      poleHeight: 300, armHeight: 264, baseThickness: 2.5,
      profiles: [
        { length: 360, armDiameter: 11, poleDiameter: 16, baseWidth: 32, connectionHeight: 22 },
        { length: 480, armDiameter: 13, poleDiameter: 18, baseWidth: 34, connectionHeight: 22 },
        { length: 600, armDiameter: 14, poleDiameter: 20, baseWidth: 36, connectionHeight: 22 },
        { length: 720, armDiameter: 15, poleDiameter: 22, baseWidth: 38, connectionHeight: 30 },
        { length: 840, armDiameter: 17, poleDiameter: 24, baseWidth: 40, connectionHeight: 30 },
        { length: 936, armDiameter: 18, poleDiameter: 26, baseWidth: 42, connectionHeight: 30 },
      ],
    },
    span: {
      minLength: 120, maxLength: 3000, defaultLength: 960,
      minPostHeight: 180, maxPostHeight: 600, defaultPostHeight: 360,
      minPostWidth: 12, maxPostWidth: 36, defaultPostWidth: 18,
      sagRatio: 0.05, topClearance: 12, wireSeparation: 12, mountGap: 8,
      concreteTaperPerFoot: 0.162, concreteChamfer: 0.75,
    },
  },
  colors: { red: '#ff3028', yellow: '#ffbf00', green: '#00df99', white: '#ffffff' },
  busAngles: { 'bus-stop': 90, 'bus-straight': 0, 'bus-left': -45, 'bus-right': 45 },
  housingColors: { black: '#252628', yellow: '#e9b82a', green: '#3d4b35' },
  arrowAngles: { up: 0, right: 90, down: 180, left: -90, 'up-left': -45, 'up-right': 45 },
  symbols: {
    ball: 'Circular', left: 'Left arrow', right: 'Right arrow', up: 'Up arrow',
    down: 'Down arrow', 'up-left': 'Up-left arrow', 'up-right': 'Up-right arrow',
    'u-turn': 'U-turn arrow', bicycle: 'Bicycle',
    'bus-stop': 'Bus stop', 'bus-straight': 'Bus go straight',
    'bus-left': 'Bus go left', 'bus-right': 'Bus go right',
  },
};
