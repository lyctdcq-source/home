import { AiIntentResult, GisProject, GlobeLightingMode } from '../types/gis';

function matchProjectClient(text: string, projects: GisProject[]): GisProject | undefined {
  const q = text.toLowerCase();
  const aliasRules: Array<{ match: RegExp; projectHint: RegExp }> = [
    { match: /滨江|绿道|踏勘|古树|长三角|上海|fgg/i, projectHint: /滨江|fgg/i },
    { match: /蜂场|蜂|蜜源|山谷|瑞士|拉克斯|bee/i, projectHint: /蜂场|bee/i },
    { match: /雨水|积水|井盖|排水|污水|巡检|wastewater/i, projectHint: /雨水|wastewater/i },
    { match: /草原|牧场|生态|足迹|牧|livestock/i, projectHint: /草原|livestock/i },
  ];

  for (const p of projects) {
    if (q.includes(p.name.toLowerCase()) || q.includes(p.id.toLowerCase())) {
      return p;
    }
  }

  for (const rule of aliasRules) {
    if (rule.match.test(text)) {
      const found = projects.find((p) => rule.projectHint.test(p.name));
      if (found) return found;
    }
  }
  return undefined;
}

export function fallbackParseIntent(query: string, projects: GisProject[]): AiIntentResult {
  const text = query.trim();

  if (/设置|偏好|底图样式|配置/.test(text)) {
    return {
      action: 'OPEN_SETTINGS',
      reply: '已为您打开系统设置与地图偏好面板。',
      source: 'local',
    };
  }

  if (/暂停.*转|停止.*转|关闭.*自转/.test(text)) {
    return {
      action: 'TOGGLE_ROTATION',
      autoRotate: false,
      reply: '已暂停 3D 地球自动旋转，方便仔细查看地点。',
      source: 'local',
    };
  }

  if (/开启.*转|恢复.*转|开始.*自转/.test(text)) {
    return {
      action: 'TOGGLE_ROTATION',
      autoRotate: true,
      reply: '已恢复 3D 地球轻缓旋转。',
      source: 'local',
    };
  }

  if (/随时间|自动光影|自动昼夜|恢复默认光影/.test(text)) {
    return {
      action: 'SET_ATMOSPHERE',
      atmosphere: 'auto',
      reply: '已切换为「随时间变化」的晨昏昼夜地球光影。',
      source: 'local',
    };
  }

  if (/夜光|夜间|夜晚|夜景|城市灯光|星空|深空/.test(text)) {
    return {
      action: 'SET_ATMOSPHERE',
      atmosphere: 'night',
      reply: '已将 3D 地球与天空切换为夜光星空模式。',
      source: 'local',
    };
  }

  if (/晚霞|黄昏|傍晚|日落|夕阳|霞光/.test(text)) {
    return {
      action: 'SET_ATMOSPHERE',
      atmosphere: 'sunset',
      reply: '已将 3D 地球与天空切换为晚霞暮光模式。',
      source: 'local',
    };
  }

  if (/晨光|清晨|黎明|早上|日出|晨昏/.test(text)) {
    return {
      action: 'SET_ATMOSPHERE',
      atmosphere: 'dawn',
      reply: '已将 3D 地球与天空切换为清新晨光模式。',
      source: 'local',
    };
  }

  if (/中午|正午|日光|白天|晴空|苍穹/.test(text)) {
    return {
      action: 'SET_ATMOSPHERE',
      atmosphere: 'noon',
      reply: '已将 3D 地球与天空切换为明朗中午模式。',
      source: 'local',
    };
  }

  if (/新建|创建|建立|发起/.test(text)) {
    const storageType = /云端|协同|协作|共享|在线/.test(text) ? 'cloud' : 'local';
    let template: 'cadastral' | 'pipeline' | 'photogrammetry' = 'cadastral';
    if (/巡检|设施|井盖|积水|管网|管线|排水/.test(text)) template = 'pipeline';
    else if (/地块|面积|核查|航测|实景|影像/.test(text)) template = 'photogrammetry';

    let crs: 'CGCS2000' | 'WGS84' | 'EPSG:2056' = 'CGCS2000';
    if (/wgs|84|全球/i.test(text)) crs = 'WGS84';
    else if (/2056/.test(text)) crs = 'EPSG:2056';

    let regionIndex = 0;
    if (/成渝|成都|重庆|四川/.test(text)) regionIndex = 1;
    else if (/京津冀|北京|天津|河北/.test(text)) regionIndex = 2;
    else if (/粤港澳|大湾区|广州|深圳/.test(text)) regionIndex = 3;

    const cleanedName = text
      .replace(/帮我|请|新建|创建|建立|发起|一个|一项|调查|任务|工程|项目|云端|本地|离线|协同|共享/g, '')
      .trim();

    return {
      action: 'CREATE_PROJECT',
      createDraft: {
        name: cleanedName.length >= 2 ? cleanedName : undefined,
        storageType,
        template,
        crs,
        regionIndex,
      },
      reply: '已打开新建调查向导，并按您的要求预选好场景与区域。',
      source: 'local',
    };
  }

  const matchedProject = matchProjectClient(text, projects);

  if (/同步|上传/.test(text)) {
    const target =
      matchedProject ||
      projects.find((p) => p.sizeOrSyncLabel.includes('待')) ||
      projects[0];
    return {
      action: 'SYNC_PROJECT',
      projectId: target?.id,
      reply: target
        ? `已将「${target.name}」的现场记录安全同步至云端。`
        : '已完成现场记录同步检查。',
      source: 'local',
    };
  }

  if (/置顶|设为常用|设为默认|主工程/.test(text) && matchedProject) {
    return {
      action: 'PIN_PROJECT',
      projectId: matchedProject.id,
      reply: `已将「${matchedProject.name}」设为首页常用调查。`,
      source: 'local',
    };
  }

  if (/云端/.test(text) && !matchedProject) {
    return {
      action: 'FILTER_PROJECTS',
      filter: 'cloud',
      reply: '已筛选显示全部云端协作调查。',
      source: 'local',
    };
  }

  if (/本地|离线/.test(text) && !matchedProject) {
    return {
      action: 'FILTER_PROJECTS',
      filter: 'local',
      reply: '已筛选显示全部本地离线调查。',
      source: 'local',
    };
  }

  if (/全部|所有|显示全部|清空筛选/.test(text)) {
    return {
      action: 'FILTER_PROJECTS',
      filter: 'all',
      reply: '已恢复显示全部最近调查。',
      source: 'local',
    };
  }

  if (matchedProject && /打开|进入|继续|外业|采集|记录|概览|详情|查看/.test(text)) {
    return {
      action: 'OPEN_PROJECT',
      projectId: matchedProject.id,
      reply: `正在为您打开「${matchedProject.name}」详情。`,
      source: 'local',
    };
  }

  if (matchedProject) {
    return {
      action: 'FOCUS_PROJECT',
      projectId: matchedProject.id,
      reply: `已将 3D 地球定位到「${matchedProject.name}」(${matchedProject.coordinateLabel})。`,
      source: 'local',
    };
  }

  return {
    action: 'UNKNOWN',
    reply: '你可以试试说：“看看山谷蜂场调查”、“打开滨江绿道继续记录”、“新建乡村果园调查”或“切换夜光星空模式”。',
    source: 'local',
  };
}

export async function dispatchAiIntent(
  query: string,
  projects: GisProject[],
  currentAtmosphere: GlobeLightingMode
): Promise<AiIntentResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5500);
    const res = await fetch('/api/ai/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        query,
        currentAtmosphere,
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          storageType: p.storageType,
          coordinateLabel: p.coordinateLabel,
          crs: p.crs,
          sizeOrSyncLabel: p.sizeOrSyncLabel,
        })),
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return fallbackParseIntent(query, projects);
    }

    const data = (await res.json()) as AiIntentResult;
    if (!data || !data.action) {
      return fallbackParseIntent(query, projects);
    }
    return data;
  } catch {
    return fallbackParseIntent(query, projects);
  }
}
