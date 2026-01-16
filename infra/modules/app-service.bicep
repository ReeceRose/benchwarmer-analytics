@description('Base name for resources')
param appName string

@description('Azure region for resources')
param location string = resourceGroup().location

@description('App Service Plan SKU')
@allowed(['F1', 'B1', 'B2'])
param sku string = 'B1'

@description('Database connection string')
@secure()
param connectionString string

@description('API key for admin endpoints')
@secure()
param apiKey string

@description('Allowed CORS origins array')
param corsOrigins array = []

var appServicePlanName = '${appName}-plan'
var webAppName = '${appName}-api'

var baseAppSettings = [
  {
    name: 'ASPNETCORE_ENVIRONMENT'
    value: 'Production'
  }
  {
    name: 'ConnectionStrings__DefaultConnection'
    value: connectionString
  }
  {
    name: 'Admin__ApiKey'
    value: apiKey
  }
]

var corsAppSettings = [for (origin, i) in corsOrigins: {
  name: 'Cors__AllowedOrigins__${i}'
  value: origin
}]

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: sku
    tier: sku == 'F1' ? 'Free' : 'Basic'
  }
  properties: {
    reserved: true // Linux
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|10.0'
      alwaysOn: sku != 'F1' // Free tier doesn't support always on
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: concat(baseAppSettings, corsAppSettings)
    }
  }
}

output webAppName string = webApp.name
output webAppHostName string = webApp.properties.defaultHostName
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
