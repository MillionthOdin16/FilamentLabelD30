
from playwright.sync_api import sync_playwright

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use iPhone 14 Pro viewport
        context = browser.new_context(viewport={"width": 393, "height": 852})
        page = context.new_page()

        # Navigate to app
        page.goto("http://localhost:3000/")

        # Screenshot Home
        page.screenshot(path="/home/jules/verification/home_v2.png")
        print("Home screenshot taken")

        # Go to Manual Entry (Editor)
        page.get_by_text("Manual").click()

        # Screenshot Editor
        page.screenshot(path="/home/jules/verification/editor_v2.png")
        print("Editor screenshot taken")

        browser.close()

if __name__ == "__main__":
    verify_ui()
