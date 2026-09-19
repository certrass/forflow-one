import { test, expect, type Page } from '@stablyai/playwright-test'
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { launch, evidence } from './harness'
import { privateProfile, addPrivateProject } from './private-fixture'
import { cleanupE2EDaemons, closeElectronAppForE2E } from '../e2e/helpers/electron-process-shutdown'

const reply = z.object({ ok: z.literal(true), result: z.unknown() })
async function call(page: Page, method: string, params: Record<string, unknown>) {
  return page.evaluate(({ method, params }) => window.api.runtime.call({ method, params }), {
    method,
    params
  })
}

test('web permission consent, cancelled upload, approved byte-exact upload and navigation revocation', async () => {
  const received: Buffer[] = []
  const server = createServer(async (request, response) => {
    if (request.method === 'POST') {
      const chunks: Buffer[] = []
      for await (const chunk of request) {
        chunks.push(Buffer.from(chunk))
      }
      received.push(Buffer.concat(chunks))
      response.end('saved')
      return
    }
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end(
      '<!doctype html><title>本机数据接收测试</title><h1>本机数据接收测试</h1><input type="file" aria-label="测试数据文件" id="upload"><output id="result">等待文件</output><script>document.getElementById("upload").addEventListener("change",async (e)=>{await fetch("/upload",{method:"POST",body:e.target.files[0]});document.getElementById("result").textContent="上传完成";});</script>'
    )
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('没有测试端口')
  }
  const origin = `http://127.0.0.1:${address.port}`
  const profile = privateProfile('upload')
  const fixture = Buffer.concat([Buffer.from('Forflow 中文上传测试\n'), Buffer.alloc(32768, 73)])
  const fixturePath = path.join(profile, '中文-测试数据.txt')
  writeFileSync(fixturePath, fixture)
  const { app, page, errors } = await launch(profile)
  try {
    const worktree = await addPrivateProject(page, profile)
    const created = reply.parse(
      await call(page, 'browser.tabCreate', {
        worktree,
        url: origin,
        activate: true,
        waitForRegistration: true
      })
    )
    writeFileSync(path.join(evidence, 'browser-created.json'), JSON.stringify(created, null, 2))
    const browserPage = z.object({ browserPageId: z.string() }).parse(created.result).browserPageId
    await expect
      .poll(async () => JSON.stringify(await call(page, 'browser.tabList', { worktree })))
      .toContain(origin)
    const target = { page: browserPage }
    const snapshot = z
      .object({ refs: z.record(z.string(), z.object({ name: z.string() })) })
      .parse(reply.parse(await call(page, 'browser.snapshot', target)).result)
    const refKey = Object.entries(snapshot.refs).find(([, entry]) =>
      entry.name.includes('测试数据文件')
    )?.[0]
    const ref = refKey ? `@${refKey}` : undefined
    expect(ref, JSON.stringify(snapshot)).toBeTruthy()
    const cancelled = call(page, 'browser.upload', {
      ...target,
      element: ref,
      files: [fixturePath]
    })
    const approval = page.getByRole('dialog').filter({ hasText: '确认数据传输' })
    await expect(approval).toContainText(origin)
    await expect(approval).toContainText('中文-测试数据.txt')
    expect(received).toHaveLength(0)
    await approval.getByRole('button', { name: '取消', exact: true }).click()
    expect(await cancelled).toMatchObject({ ok: false })
    expect(received).toHaveLength(0)
    const allowed = call(page, 'browser.upload', { ...target, element: ref, files: [fixturePath] })
    await expect(approval).toBeVisible()
    await page.screenshot({ path: path.join(evidence, 'upload-confirmation.png') })
    await approval.getByRole('button', { name: '允许本次操作', exact: true }).click()
    expect(await allowed).toMatchObject({ ok: true })
    await expect.poll(() => received.length).toBe(1)
    expect(received[0]).toEqual(fixture)
    const permissionCall = () =>
      call(page, 'browser.eval', { ...target, expression: 'Notification.requestPermission()' })
    const deniedPermission = permissionCall()
    const consent = page.getByRole('dialog').filter({ hasText: '确认网站权限' })
    await expect(consent).toContainText(origin)
    await consent.getByRole('button', { name: '取消', exact: true }).click()
    expect(JSON.stringify(await deniedPermission)).toContain('denied')
    const allowedPermission = permissionCall()
    await expect(consent).toBeVisible()
    await page.screenshot({ path: path.join(evidence, 'website-permission-confirmation.png') })
    await consent.getByRole('button', { name: '允许本次操作', exact: true }).click()
    expect(JSON.stringify(await allowedPermission)).toContain('granted')
    reply.parse(await call(page, 'browser.reload', target))
    const afterReload = permissionCall()
    await expect(consent).toBeVisible()
    await consent.getByRole('button', { name: '取消', exact: true }).click()
    expect(JSON.stringify(await afterReload)).toContain('denied')
    expect(errors).toEqual([])
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().some((win) => win.isVisible())
      )
    ).toBe(false)
    writeFileSync(
      path.join(evidence, 'permissions-upload-result.json'),
      JSON.stringify(
        {
          receiver: origin,
          cancelledBytes: 0,
          approvedBytes: fixture.length,
          sha256: createHash('sha256').update(received[0]).digest('hex'),
          permissionDenied: true,
          permissionGranted: true,
          revokedAfterNavigation: true,
          errors
        },
        null,
        2
      )
    )
  } finally {
    writeFileSync(
      path.join(evidence, 'permissions-upload.spec.ts-final-dom.txt'),
      await page
        .locator('body')
        .innerText()
        .catch(() => 'renderer closed')
    )
    writeFileSync(
      path.join(evidence, 'permissions-upload.spec.ts-errors.json'),
      JSON.stringify(errors)
    )
    await page
      .screenshot({ path: path.join(evidence, 'permissions-upload.spec.ts-final.png') })
      .catch(() => undefined)
    await closeElectronAppForE2E(app)
    await cleanupE2EDaemons(profile)
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})
