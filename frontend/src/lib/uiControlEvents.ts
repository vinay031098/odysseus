/** Custom events for agent ui_control toggles not stored in odysseus-toggles. */

export const UI_CONTROL_EVENTS = {
  rag: 'odysseus:ui-control-rag',
  incognito: 'odysseus:ui-control-incognito',
} as const

export type UiControlToggleDetail = { state: boolean }

export function dispatchUiControlToggle(
  toggle: keyof typeof UI_CONTROL_EVENTS,
  state: boolean,
): void {
  window.dispatchEvent(
    new CustomEvent<UiControlToggleDetail>(UI_CONTROL_EVENTS[toggle], {
      detail: { state },
    }),
  )
}
