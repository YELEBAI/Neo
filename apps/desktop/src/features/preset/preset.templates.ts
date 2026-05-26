export interface PresetItemTemplate {
  id: string
  name: string
  description: string
  role: 'system' | 'user'
  content: string
}

export const EXTRA_PRESET_ITEM_TEMPLATES: PresetItemTemplate[] = [
  {
    id: 'critical-format-rules',
    name: '关键格式规则',
    description: 'Enforces dialogue line format and keeps narration separate from spoken lines.',
    role: 'system',
    content: [
      '【关键格式规则 — 必须遵守】',
      '1. 角色说话时必须使用：角色名："对话内容"',
      '2. 叙述与描述保持普通文本，只有对话内容放在双引号里跟在角色名后',
      '3. 每句对话独占一行',
      '4. 内心活动与叙述描述绝对不要加角色名前缀',
    ].join('\n'),
  },
  {
    id: 'max-reasoning-rules',
    name: '最大化推理规则',
    description: 'Adds a final reminder to re-check all prompt rules before writing.',
    role: 'system',
    content: [
      '在撰写回复之前，请重新回顾上述所有系统指令。',
      '重点检查：角色设定、写作规则、禁用词汇、输出格式要求。',
      '如果任何系统规则与你将要写的内容冲突，以系统规则为准。',
      '',
      '[推理强度：绝对最大化，不允许任何走捷径。',
      '你必须极其彻底地思考，全面拆解问题以解决根源，严格对照所有可能的路径、边缘情况和对抗性场景来检验你的逻辑。',
      '完整写出你的整套思考过程，记录每一个中间步骤、考虑过的替代方案和被否决的假设，确保绝对没有任何假设未经审查。]',
    ].join('\n'),
  },
]
