
from playwright.sync_api import sync_playwright

def verify_analysis_ui():
    with sync_playwright() as p:
        # Use a mobile viewport to match user preference/test environment
        browser = p.chromium.launch(headless=True)
        # iPhone 14 Pro viewport
        context = browser.new_context(viewport={"width": 393, "height": 852})
        page = context.new_page()

        try:
            # We can't trigger the real camera/analysis flow easily in headless mode without a mock file
            # BUT we can check if the UI changes are loaded by checking components on the home page first
            # to verify the app is running, and then using a special trick:
            # We can navigate to the URL and inject state if possible, or just rely on the codebase update.

            # Actually, to verify the analysis UI, we really need to be IN the analysis state.
            # `App.tsx` controls state.
            # I can't easily force state from outside without "window" hacks.

            # Let's try to simulate an upload to trigger analysis state
            print("Navigating to home...")
            page.goto("http://localhost:3000")

            # Create a dummy image for upload
            # We need a file to upload.
            # There is a file input in the code: type="file"

            print("Uploading dummy image...")
            # We will use a small dummy base64 or create a file
            # Playwright can set input files.

            # Create a dummy file
            import os
            with open("verification/dummy.png", "wb") as f:
                 f.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82')

            # Trigger file upload
            # Note: The input is hidden in the UI but accessible via label/ref
            # We can locate the input[type=file]
            file_input = page.locator('input[type="file"]')
            file_input.set_input_files("verification/dummy.png")

            # Wait for "ANALYZING" or "Processing" text which indicates state change
            print("Waiting for Analysis View...")
            page.wait_for_selector("text=NEURAL SCAN", timeout=5000)

            # Take screenshot of the Analysis UI
            print("Taking screenshot...")
            page.screenshot(path="verification/analysis_ui_check.png")
            print("Screenshot saved to verification/analysis_ui_check.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_analysis.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_analysis_ui()
