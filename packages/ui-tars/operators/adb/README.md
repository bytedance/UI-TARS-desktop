# @ui-tars/operator-adb

Operator Android SDK for UI-TARS using ADB.

## Features

- Screen capture via ADB
- Touch and swipe simulation
- Chinese input support 

## Prerequisites

### Chinese Input Support

This project uses [ADBKeyBoard](https://github.com/senzhk/ADBKeyBoard/blob/master/ADBKeyboard.apk) for Chinese input. Please follow these steps to configure:

1. Download and install ADBKeyBoard:
```bash
adb install /path/to/AdbKeyboard.apk
```

2. Activate the input method:
```bash
adb shell ime set com.android.adbkeyboard/.AdbIME
```
