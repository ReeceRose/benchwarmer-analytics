@description('Base name for resources')
param appName string

@description('Azure region for resources')
param location string = resourceGroup().location

@description('Backend API URL for proxying')
param apiUrl string

var staticWebAppName = '${appName}-client'

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    buildProperties: {
      appLocation: 'client'
      outputLocation: 'dist'
    }
  }
}

resource staticWebAppSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    API_URL: apiUrl
  }
}

output staticWebAppName string = staticWebApp.name
output staticWebAppHostName string = staticWebApp.properties.defaultHostname
output staticWebAppUrl string = 'https://${staticWebApp.properties.defaultHostname}'
