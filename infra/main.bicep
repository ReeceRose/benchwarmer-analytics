targetScope = 'resourceGroup'

@description('Base name for all resources')
param appName string = 'benchwarmer'

@description('Azure region for resources')
param location string = resourceGroup().location

module staticWebApp 'modules/static-web-app.bicep' = {
  name: 'staticWebApp'
  params: {
    appName: appName
    location: location
    apiUrl: '' // Set via VITE_API_URL at build time
  }
}

output clientUrl string = staticWebApp.outputs.staticWebAppUrl
output clientHostName string = staticWebApp.outputs.staticWebAppHostName
output staticWebAppName string = staticWebApp.outputs.staticWebAppName
