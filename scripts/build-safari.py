"""Generate a reproducible Xcode project and build an ad-hoc local development app."""
from pathlib import Path
import plistlib
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
out = ROOT / 'work/xcode'
project = out / 'At Safari'
if not (project / 'At Safari.xcodeproj').exists():
    subprocess.run(['xcrun','safari-web-extension-converter',str(ROOT/'apps/safari/web-extension'),
                    '--project-location',str(out),'--app-name','At Safari',
                    '--bundle-identifier','io.github.xsystemh.at-safari','--swift',
                    '--macos-only','--copy-resources','--no-open','--no-prompt'],check=True)
if not (project / 'At Safari.xcodeproj').exists():
    raise SystemExit('Safari converter did not create a project. Check macOS file access permissions.')
extension = project / 'At Safari Extension'
shutil.copytree(ROOT/'apps/safari/web-extension',extension/'Resources',dirs_exist_ok=True)
shutil.copy2(ROOT/'apps/safari/native/SafariWebExtensionHandler.swift',extension/'SafariWebExtensionHandler.swift')
for name in ['At Safari','At Safari Extension']:
    info = project/name/'Info.plist'
    data = plistlib.loads(info.read_bytes())
    data['NSAppTransportSecurity'] = {'NSAllowsLocalNetworking': True}
    info.write_bytes(plistlib.dumps(data))
pbx = project/'At Safari.xcodeproj/project.pbxproj'
text = pbx.read_text().replace('io.github.xsystemh.At-Safari', 'io.github.xsystemh.at-safari')
if 'ENABLE_OUTGOING_NETWORK_CONNECTIONS = YES;' not in text:
    text = text.replace('ENABLE_APP_SANDBOX = YES;', 'ENABLE_APP_SANDBOX = YES;\n\t\t\t\tENABLE_OUTGOING_NETWORK_CONNECTIONS = YES;')
pbx.write_text(text)
subprocess.run(['xcodebuild','-project',str(project/'At Safari.xcodeproj'),'-scheme','At Safari',
                '-configuration','Debug','-derivedDataPath',str(ROOT/'work/DerivedData'),
                'CODE_SIGN_IDENTITY=-','CODE_SIGN_STYLE=Manual','DEVELOPMENT_TEAM=',
                'CODE_SIGNING_ALLOWED=YES','MACOSX_DEPLOYMENT_TARGET=14.0','build'],check=True)
app = ROOT/'work/DerivedData/Build/Products/Debug/At Safari.app'
print('\nDevelopment app:',app)
print('This ad-hoc build is not notarized. Safari may require the user to allow unsigned extensions for development.')
