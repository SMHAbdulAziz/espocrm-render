/*!
FullCalendar Moment Timezone Plugin v6.1.8
Docs & License: https://fullcalendar.io/docs/moment-timezone-plugin
(c) 2023 Adam Shaw
*/
FullCalendar.MomentTimezone=((e,t,a,l)=>{function n(e){return e&&e.__esModule?e:{default:e}}var r=n(a);class m extends l.NamedTimeZoneImpl{offsetForArray(e){return r.default.tz(e,this.timeZoneName).utcOffset()}timestampToArray(e){return r.default.tz(e,this.timeZoneName).toArray()}}return a=t.createPlugin({name:"@fullcalendar/moment-timezone",namedTimeZonedImpl:m}),t.globalPlugins.push(a),e.default=a,Object.defineProperty(e,"__esModule",{value:!0}),e})({},FullCalendar,moment,FullCalendar.Internal);
//# sourceMappingURL=fullcalendar-moment-timezone.js.map