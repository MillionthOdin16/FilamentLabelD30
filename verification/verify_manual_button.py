from playwright.sync_api import sync_playwright

def verify_manual_button():
    with sync_playwright() as p:
        # Use a mobile viewport to match user preference/test environment
        browser = p.chromium.launch(headless=True)
        # iPhone 14 Pro viewport
        context = browser.new_context(viewport={"width": 393, "height": 852})
        page = context.new_page()

        try:
            print("Navigating to home...")
            page.goto("http://localhost:3000")

            # Wait for content to load
            print("Waiting for 'Filament ID'...")
            page.wait_for_selector("text=Filament ID")

            # Locate the Manual button
            # It should have text "Manual" and "Type Details"
            manual_btn = page.locator("text=Manual").first

            print("Checking visibility...")
            if manual_btn.is_visible():
                print("Manual button visible.")

                # Scroll into view if needed
                manual_btn.scroll_into_view_if_needed()

                # Take screenshot of the home screen
                print("Taking screenshot...")
                page.screenshot(path="verification/manual_button_check.png")
                print("Screenshot saved to verification/manual_button_check.png")
            else:
                print("Manual button NOT visible!")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_manual_button()
