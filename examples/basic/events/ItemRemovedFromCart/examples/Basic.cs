public static async Task ConnectAsync()
{
  string clientId = Guid.NewGuid().ToString();
  string mqttURI = {REPLACE THIS WITH YOUR MQTT SERVER URI HERE}
  string mqttUser = { REPLACE THIS WITH YOUR MQTT USER HERE }
  string mqttPassword = { REPLACE THIS WITH YOUR MQTT PASSWORD HERE }
  int mqttPort = { REPLACE THIS WITH YOUR MQTT PORT HERE }
  bool mqttSecure = {IF YOU ARE USING SSL Port THEN SET true OTHERWISE SET false}

  var messageBuilder = new MqttClientOptionsBuilder()
    .WithClientId(clientId)
    .WithCredentials(mqttUser, mqttPassword)
    .WithTcpServer(mqttURI, mqttPort)
    .WithCleanSession();

  var options = mqttSecure
    ? messageBuilder
      .WithTls()
      .Build()
    : messageBuilder
      .Build();

  var managedOptions = new ManagedMqttClientOptionsBuilder()
    .WithAutoReconnectDelay(TimeSpan.FromSeconds(5))
    .WithClientOptions(options)
    .Build();

  client = new MqttFactory().CreateManagedMqttClient();

  await client.StartAsync(managedOptions);
}