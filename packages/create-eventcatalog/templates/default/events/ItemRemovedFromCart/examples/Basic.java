public class EngineTemperatureSensor implements Callable<Void> {

    public EngineTemperatureSensor(IMqttClient client) {
        this.client = client;
    }

    @Override
    public Void call() throws Exception {        
        if ( !client.isConnected()) {
            return null;
        }           
        MqttMessage msg = readEngineTemp();
        msg.setQos(0);
        msg.setRetained(true);
        client.publish(TOPIC,msg);        
        return null;        
    }

    private MqttMessage readEngineTemp() {             
        double temp =  80 + rnd.nextDouble() * 20.0;        
        byte[] payload = String.format("T:%04.2f",temp)
          .getBytes();        
        return new MqttMessage(payload);           
    }
}