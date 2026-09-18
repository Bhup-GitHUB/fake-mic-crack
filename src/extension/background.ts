chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL('index.html')
  const tabs = await chrome.tabs.query({ url })

  if (tabs[0]?.id !== undefined) {
    await chrome.tabs.update(tabs[0].id, { active: true })
    if (tabs[0].windowId !== undefined) {
      await chrome.windows.update(tabs[0].windowId, { focused: true })
    }
    return
  }

  await chrome.tabs.create({ url })
})
