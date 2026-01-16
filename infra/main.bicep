targetScope = 'resourceGroup'

@description('Base name for all resources')
param appName string = 'benchwarmer'

@description('Azure region for resources')
param location string = resourceGroup().location

@description('App Service Plan SKU')
@allowed(['F1', 'B1', 'B2'])
param appServiceSku string = 'B1'

@description('Database connection string')
@secure()
param connectionString string

@description('API key for admin endpoints')
@secure()
param apiKey string

@description('Custom domain for the frontend')
param customDomain string = 'https://benchwarmer.reecerose.com'

// Deploy Static Web App first to get its URL for CORS
module staticWebApp 'modules/static-web-app.bicep' = {
  name: 'staticWebApp'
  params: {
    appName: appName
    location: location
    apiUrl: '' // Set via VITE_API_URL at build time
  }
}

module appService 'modules/app-service.bicep' = {
  name: 'appService'
  params: {
    appName: appName
    location: location
    sku: appServiceSku
    connectionString: connectionString
    apiKey: apiKey
    corsOrigins: [
      staticWebApp.outputs.staticWebAppUrl  // Auto-generated SWA URL
      customDomain                           // Custom domain
    ]
  }
}

output apiUrl string = appService.outputs.webAppUrl
output apiHostName string = appService.outputs.webAppHostName
output clientUrl string = staticWebApp.outputs.staticWebAppUrl
output clientHostName string = staticWebApp.outputs.staticWebAppHostName
output staticWebAppDeploymentToken string = staticWebApp.outputs.deploymentToken
