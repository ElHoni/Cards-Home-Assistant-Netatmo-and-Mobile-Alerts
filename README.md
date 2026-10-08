# Cards-Home-Assistant-Netatmo-and-Mobile-Alerts
How to add cards for Netatmo or Mobile Alerts to Home Assistant
Netatmo / Mobile Alerts Karten Home Assistant.
2 Karten für Netatmo: 
Indoor- und Outdoor-Modul über netatmo-indoor-card.js
 Regen- und Windmesser über netatmo-gauge-card.js

1 Karte für Mobile Alerts;
 mobile-alerts-card.js

1.	Die entsprechende -card.js nach /config/www/ kopieren.
2.	Unter Einstellungen → Dashboards → ⋮ → Ressourcen /local/XXX0-card.js die entsprechende Karte als JavaScript-Modul hinzufügen.

YAML Netatmo Indoor/Outdoor: (X durch Deinen Sensor ersetzen)
type: custom:netatmo-indoor-card
name: Wohnzimmer
temperature: sensor.XXX_temperature
humidity: sensor.XXX_humidity
co2: sensor.XXX_carbon_dioxide
wifi: sensor.XXX_wi_fi_strength
battery: sensor.XXX_battery

YAML Netatmo Gauge:
Regenmesser:
type: custom:netatmo-rain-card
name: Garten
rain: sensor.DEIN_REGENMESSER_niederschlag
rain_1h: sensor.DEIN_REGENMESSER_niederschlag_1h
rain_24h: sensor.DEIN_REGENMESSER_niederschlag_24h
wifi: sensor.DEIN_REGENMESSER_funksignal
battery: sensor.DEIN_REGENMESSER_batterie


YAML Netatmo Gauge:
Windmesser:
type: custom:netatmo-wind-card
name: Dach
wind_speed: sensor.DEIN_WINDMESSER_windgeschwindigkeit
wind_direction: sensor.DEIN_WINDMESSER_windrichtung
gust_speed: sensor.DEIN_WINDMESSER_boeen
gust_direction: sensor.DEIN_WINDMESSER_boeenrichtung
wifi: sensor.DEIN_WINDMESSER_funksignal
battery: sensor.DEIN_WINDMESSER_batterie

Mobile Alerts:
Farbskalen: Mobile Alerts nutzt man oft nicht nur im Wohnraum, deshalb gibt es Voreinstellungen:
YAML:
scale: indoor    # Standard: Wohnraum
scale: outdoor   # draußen, auch Minusgrade
scale: fridge    # Kühlschrank: ideal 3–5 °C, rot ab 10 °C
scale: freezer   # Gefrierschrank: ideal −18 °C, rot ab −5 °C

Konfiguration (die Entitätsnamen sind Platzhalter):
type: custom:mobile-alerts-card
name: Wohnzimmer
scale: indoor
temperature: sensor.DEIN_MODUL_temperatur
humidity: sensor.DEIN_MODUL_luftfeuchtigkeit
battery: binary_sensor.DEIN_MODUL_batterie
signal: sensor.DEIN_MODUL_signal



YAML Mobile Alerts Feuchtemesser:

type: custom:mobile-alerts-card
variant: humidity
name: Keller
humidity: sensor.DEIN_MODUL_luftfeuchte
temperature: sensor.DEIN_MODUL_temperatur_t1
moisture: binary_sensor.DEIN_MODUL_feuchtigkeit
battery: binary_sensor.DEIN_MODUL_batterie
last_seen: sensor.DEIN_MODUL_zuletzt_gesehen
