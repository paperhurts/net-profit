"""Smoke test for Net Profit (prototype build).

Drives the real game headlessly at phone size through window.__np:
  1. core loop  - sail to a sardine school, fill the hold, return, sell
  2. range gate - a dinghy is held inside its range ring
  3. day cycle  - dawn spawns a sparkle rare; night activates glowing schools
Usage:  pip install playwright && playwright install chromium
        python smoke_test.py path/or/url/to/net-profit.html
"""
import asyncio, json, pathlib, sys
from playwright.async_api import async_playwright

target = sys.argv[1] if len(sys.argv) > 1 else "net-profit.html"
URL = target if "://" in target else pathlib.Path(target).resolve().as_uri()
CX, CY = 195, 420  # joystick anchor

async def page(browser, save=None):
    ctx = await browser.new_context(viewport={"width": 390, "height": 780}, device_scale_factor=2)
    pg = await ctx.new_page(); pg.errors = []
    pg.on("pageerror", lambda e: pg.errors.append(str(e)))
    if save is not None:
        await pg.add_init_script("try{localStorage.setItem('netprofit.v1', '%s')}catch(e){}" % json.dumps(save))
    await pg.goto(URL); await pg.wait_for_timeout(400); await pg.click("#go")
    return ctx, pg

async def steer_to(pg, tx, ty, wobble=0, i=0):
    bx, by = await pg.evaluate("[__np.boat.x, __np.boat.y]")
    dx = tx - bx + (wobble if i % 20 < 10 else -wobble)
    dy = ty - by + (wobble if i % 14 < 7 else -wobble)
    sx, sy = dx - dy, (dx + dy) / 2            # world -> screen direction
    n = (sx * sx + sy * sy) ** .5 or 1
    await pg.mouse.move(CX + sx / n * 60, CY + sy / n * 60)
    return (dx * dx + dy * dy) ** .5

async def core_loop(b):
    ctx, pg = await page(b, {"muted": True})
    sc = await pg.evaluate("[__np.schools[0].cx, __np.schools[0].cy]")
    await pg.mouse.move(CX, CY); await pg.mouse.down()
    for i in range(80):
        await steer_to(pg, sc[0], sc[1], 40, i); await pg.wait_for_timeout(150)
        if await pg.evaluate("__np.hold") >= 12: break
    assert await pg.evaluate("__np.hold") >= 12, "hold never filled"
    dock = await pg.evaluate("[__np.DOCK.x + 15, __np.DOCK.y + 45]")
    for i in range(80):
        if await steer_to(pg, dock[0], dock[1]) < 40: break
        await pg.wait_for_timeout(150)
    await pg.mouse.up(); await pg.wait_for_timeout(1800)
    assert await pg.evaluate("__np.hold") == 0, "catch was not sold"
    assert await pg.evaluate("__np.coins") >= 12, "no coins earned"
    assert not pg.errors, pg.errors
    await ctx.close(); print("ok  core loop")

async def range_gate(b):
    ctx, pg = await page(b, {"muted": True})
    await pg.evaluate("__np.boat.x = 2400 + 1100; __np.boat.y = 2400")
    await pg.mouse.move(CX, CY); await pg.mouse.down(); await pg.mouse.move(CX + 55, CY + 28)
    await pg.wait_for_timeout(4000)
    d = await pg.evaluate("Math.hypot(__np.boat.x - 2400, __np.boat.y - 2400)")
    assert d <= 1151, f"dinghy escaped its range: {d:.0f}"
    assert not pg.errors, pg.errors
    await ctx.close(); print("ok  range gate")

async def day_cycle(b):
    ctx, pg = await page(b, {"muted": True})
    await pg.evaluate("__np.clock = .999"); await pg.wait_for_timeout(1200)
    assert await pg.evaluate("__np.phase") == "Dawn"
    assert await pg.evaluate("__np.rare.on"), "no rare at dawn"
    await pg.evaluate("__np.clock = .8"); await pg.wait_for_timeout(600)
    assert await pg.evaluate("__np.phase") == "Night"
    assert not pg.errors, pg.errors
    await ctx.close(); print("ok  day cycle")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        await core_loop(b); await range_gate(b); await day_cycle(b)
        await b.close(); print("all good")

asyncio.run(main())
