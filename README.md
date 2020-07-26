# Offline test client

Offline test runner for your codeBeamer instance.
You can download previously created test runs and run them offline on your device.
It is also possible to add attachments during testing like photos or other files as well.
After you finished testing, you can easily upload the results to codeBeamer.

More details can be found on the following [wiki page](https://codebeamer.com/cb/wiki/8624348).

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Run project in browser with `npm run start`

### Prerequisites

The following tools required for the development

* node, npm
* ionic
* cordova
* xcode (for ios build)

## Getting started with iOS build

For this guide, it is assumed that Xcode is properly configured for local development and git, node and npm are all installed, also there is a supported iOS device which can be attached to the development machine.

0. Make sure that the following npm packages are installed globally:
* @ionic/cli
* cordova
* cordova-res
1. Clone the repository
2. Go into the cloned folder `cd offline-client-app`
3. Install dependencies with `npm install`
4. Generate resources with cordova-res `ionic cordova resources ios`
5. Build the project for iOS production `ionic cordova build ios --prod`
6. Open Xcode and open the built project (*offline-client-app/platforms/ios/cB Offline Test App.xcodeproj*)
7. Attach the iOS device to the machine and select it in Xcode
8. Click on Run (build and run) then wait for the app to be installed to the iOS device and it will start automatically

## Authors

* **Intland Software GmbH** - [Website](https://intland.com)

## License

This project is licensed under the BSD-3-Clause License - see the [LICENSE.md](LICENSE.md) file for details
