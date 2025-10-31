export const EDGE_Z_SCORE_VALUE = 1.0;
export const EDGE_Z_SCORE_COLOR = 'red'

export interface IGraphDataItem {
    name: string;
    uv: number;
    pv: number;
}

// export const GRAPH_DATA: IGraphDataItem[] = [
//     {
//       name: "Page A",
//       uv: 1500,
//       pv: 2400,
//     },
//     {
//       name: "Page B",
//       uv: 1500,
//       pv: 1098,
//     },
//     {
//       name: "Page C",
//       uv: 1500,
//       pv: 3200,
//     },
//     {
//       name: "Page D",
//       uv: 1500,
//       pv: 3500,
//     },
//     {
//       name: "Page E",
//       uv: 1600,
//       pv: 3900,
//     },
//     {
//       name: "Page F",
//       uv: 1600,
//       pv: 4500,
//     },
//     {
//       name: "Page G",
//       uv: 1800,
//       pv: 5500,
//     },
//     {
//       name: "Page H",
//       uv: 2590,
//       pv: 4500,
//     },
//     {
//       name: "Page I",
//       uv: 3590,
//       pv: 3200,
//     },
//     {
//       name: "Page J",
//       uv: 4000,
//       pv: 2000,
//     },
//     {
//       name: "Page K",
//       uv: 4200,
//       pv: 2100,
//     },
//     {
//       name: "Page L",
//       uv: 4000,
//       pv: 2100,
//     },
//     {
//       name: "Page M",
//       uv: 3490,
//       pv: 2100,
//     },
//     {
//       name: "Page N",
//       uv: 2590,
//       pv: 2100,
//     },
//     {
//       name: "Page O",
//       uv: 1800,
//       pv: 2100,
//     },
//     {
//       name: "Page P",
//       uv: 1850,
//       pv: 2100,
//     },
//   ];

export const GRAPH_DATA: IGraphDataItem[] = [
  {
    name: "Page A",
    uv: 1500,
    pv: 2400,
  },
  {
    name: "Page B",
    uv: 1500,
    pv: 1098,
  },
  {
    name: "Page C",
    uv: 1500,
    pv: 3200,
  },
  {
    name: "Page D",
    uv: 1500,
    pv: 3500,
  },
  {
    name: "Page E",
    uv: 1600,
    pv: 3900,
  },
  {
    name: "Page F",
    uv: 1600,
    pv: 4500,
  },
  {
    name: "Page G",
    uv: 1800,
    pv: 5500,
  },
  {
    name: "Page H",
    uv: 2590,
    pv: 1000,
  },
  {
    name: "Page I",
    uv: 3590,
    pv: 1000,
  },
  {
    name: "Page J",
    uv: 4000,
    pv: 1000,
  },
  {
    name: "Page K",
    uv: 4200,
    pv: 1000,
  },
  {
    name: "Page L",
    uv: 4000,
    pv: 1000,
  },
  {
    name: "Page M",
    uv: 3490,
    pv: 1000,
  },
  {
    name: "Page N",
    uv: 2590,
    pv: 1000,
  },
  {
    name: "Page O",
    uv: 1800,
    pv: 1000,
  },
  {
    name: "Page P",
    uv: 1850,
    pv: 1000,
  },
];

  export function getMeanByKey(data: IGraphDataItem[], key: keyof Pick<IGraphDataItem, "uv" | "pv">) {
    const sum = data.reduce((acc, cur) => acc + cur[key], 0);
    return sum / data.length;
  }

  export function getStandardDeviationByKey(data: IGraphDataItem[], key: keyof Pick<IGraphDataItem, "uv" | "pv">) {
    if (data.length === 0) return 0;

    const mean = getMeanByKey(data, key);

    const varianceSum = data.reduce((acc, cur) => {
        return acc + Math.pow(cur[key] - mean, 2)
    }, 0)

    const variance = varianceSum / data.length;

    return Math.sqrt(variance);
  }

  export function getZScore(value: number, mean: number, deviation: number) {
    return (value - mean) / deviation;
  }

export function getInitialZScorePosition (key: keyof Pick<IGraphDataItem, "uv" | "pv">, mean: number, deviation: number) {
  return GRAPH_DATA.findIndex((el) => {
    const currentZScore = getZScore(el[key], mean, deviation);
    return currentZScore >= EDGE_Z_SCORE_VALUE
  })
}

export function getFinalZScorePosition (key: keyof Pick<IGraphDataItem, "uv" | "pv">, mean: number, deviation: number) {
  return GRAPH_DATA.findLastIndex((el) => {
    const currentZScore = getZScore(el[key], mean, deviation);
    return currentZScore >= EDGE_Z_SCORE_VALUE
  })
}