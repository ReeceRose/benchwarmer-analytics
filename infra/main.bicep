targetScope = 'resourceGroup'

@description('Base name for all resources')
param appName string = 'benchwarmer'

@description('Azure region for resources')
param location string = resourceGroup().location

@description('Database connection string')
@secure()
param connectionString string

@description('API key for admin endpoints')
@secure()
param apiKey string

@description('Custom domain for the frontend')
param customDomain string = 'https://benchwarmer.reecerose.com'

@description('Container image to deploy (set by CI/CD)')
param containerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

// Deploy Static Web App first to get its URL for CORS
module staticWebApp 'modules/static-web-app.bicep' = {
  name: 'staticWebApp'
  params: {
    appName: appName
    location: location
    apiUrl: '' // Set via VITE_API_URL at build time
  }
}

module containerApp 'modules/container-app.bicep' = {
  name: 'containerApp'
  params: {
    appName: appName
    location: location
    connectionString: connectionString
    apiKey: apiKey
    containerImage: containerImage
    corsOrigins: [
      staticWebApp.outputs.staticWebAppUrl
      customDomain
    ]
  }
}

output apiUrl string = containerApp.outputs.containerAppUrl
output clientUrl string = staticWebApp.outputs.staticWebAppUrl
output clientHostName string = staticWebApp.outputs.staticWebAppHostName
output staticWebAppName string = staticWebApp.outputs.staticWebAppName
output containerRegistryName string = containerApp.outputs.containerRegistryName
output containerRegistryLoginServer string = containerApp.outputs.containerRegistryLoginServer
output containerAppName string = containerApp.outputs.containerAppName
