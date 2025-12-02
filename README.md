<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1sk7zlErjRu7VuHNoCln4E1pJQ4xHVAi_

## Supported Printers

### Fully Supported
- **Phomemo D30** - Compact label maker
- **Phomemo M110** - Portable label printer
- **Phomemo M02** - Mini pocket printer
- **Phomemo Q30** - Label printer

### Experimental Support
- **IDPRT S1 Smart Pocket Printer** - ⚠️ Experimental

  > **Note**: IDPRT S1 support is experimental and may not work reliably. This printer has been added based on user request.

  #### What's Implemented
  - Bluetooth device discovery via name prefixes (`S`, `iD`)
  - Support for common BLE UART services (HM-10, Nordic UART)
  - ESC/POS bitmap printing commands (same as Phomemo printers)
  
  #### Known Limitations
  - The IDPRT S1's exact Bluetooth protocol has not been publicly documented
  - If the printer uses TSPL commands instead of ESC/POS, printing will not work
  - Some IDPRT printers may use different BLE service UUIDs
  
  #### Troubleshooting
  If printing to an IDPRT S1 fails:
  1. Ensure the printer is powered on and in Bluetooth pairing mode
  2. Check that the printer appears in the Bluetooth device selector
  3. If connection succeeds but printing fails, the printer likely uses an incompatible protocol
  
  **Feedback Welcome**: If you have an IDPRT S1 and can test this feature, please open an issue with your results!

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
