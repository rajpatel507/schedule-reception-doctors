(function(w, d){
	var ids = [10000376, 10000378];
	var paginationInterval = 5000;
	var nextDaysSchedule = 6;

	$(document).ready(function(){
		app.init();
	});

	var model = {
		clinics: [],

		addClinic: function(data) {
			var clinic = {};
			clinic.id = data.id;
			clinic.name = data.name;

			data.resources.sort(function(a,b){
				return a.lpuDepartment.name.localeCompare(b.lpuDepartment.name);
			});

			clinic.resources = data.resources;
			model.clinics.push(clinic);
		},

		getClinics: function() {
			return model.clinics;
		}
	};

	var app = {
		init: function() {
			view.init();

			app.paginationInterval = paginationInterval || 10000;

			if(ids instanceof Array) {
				var loadedCount = 0;
				ids.forEach(function(idx) {
					app.loadData(idx, function(error, data) {
						if(error) return console.log(error);
						model.addClinic({
							id: idx,
							name: data.result.name,
							resources: data.result.availableResource
						});
						if(++loadedCount == ids.length) {
							view.render();
						}
					});
				}, app);
			} else {
				throw new Error("Invalid IDs. Must be an Array.");
			}
		},

		loadData: function(id, callback) {
			var request_data = {
				'jsonrpc': '2.0',
				'id': 1,
				'method': 'get_lpu_schedule_info',
				'params': {'lpu_id': id}
			};

			$.ajax({
				url: "https://api.emias.info/jsonproxy/v1/",
				method: "POST",
				contentType: "application/json; charset=utf-8",
				data: JSON.stringify(request_data),
				dataType: "json"
			})
			.done(function( data ) {
				callback(null, data);
			})
			.fail(function( jqXHR, textStatus ) {
				callback( textStatus, null );
			});
		},

		getDepartments: function(clinic) {
			var departments = [];

			clinic.resources.forEach(function(resource) {
				var department_name = resource.lpuDepartment.name;
				departments[department_name] = departments[department_name] || {
					name: department_name,
					resources: []
				};
				departments[department_name].resources.push(resource);
			});

			return departments;
		}
	};

	var view = {
		departments: null,

		init: function() {
			view.departments = $("#departments");
		},

		render: function() {
			view.departments.empty();

			var clinics = model.getClinics();
			Object.keys(clinics).forEach(function(clinicKey, clinicIndex) {
				view.renderClinic(clinics[clinicKey]);
			});
		},

		renderClinic: function(clinic) {

			$("<h2>").text(clinic.name).appendTo(view.departments);

			var departments = app.getDepartments(clinic);
			Object.keys(departments).forEach(function(departmentKey, departmentIndex) {
				view.renderDepartment(departments[departmentKey]);
			});
		},

		renderDepartment: function(department) {
				$("<h3>").text(department.name).appendTo(view.departments);

				var table = $("<table>").appendTo(view.departments);
				var thead = $("<thead>").appendTo(table);
				var tbody = $("<tbody>").appendTo(table);
				var head_tr = $("<tr>").appendTo(thead);

				var table_titles = ["ФИО", "Кабинет", "Сегодня", "26.02", "27.02", "28.02", "1.03", "2.03", "3.03"];

				for(var i = 0; i < table_titles.length; i++) {
					$("<td>").text(table_titles[i]).appendTo(head_tr);
				}


				for(var i = 0; i < department.resources.length; i++) {
					var resource = department.resources[i];

					var resource_tr = $("<tr>").appendTo(tbody);

					var name = resource.name;
					var cabinet = "";

					var parsed_name = name.match(/(.+)\((?:к\. ?)?(\d+)\)\s*(.*)/, '');
					if(parsed_name) {
						name = (parsed_name[1] + " " + parsed_name[3]).trim();
						cabinet = parsed_name[2];
					}

					$("<td>").addClass("name").text(name).appendTo(resource_tr);
					$("<td>").addClass("cabinet").text(cabinet).appendTo(resource_tr);

					var schedules = {};
					var currentDate = new Date();

					for(var j = 0; j < resource.schedule.length; j++) {
						var schedule = resource.schedule[j];

						if(typeof(schedule.date) != "string") {
							continue;
						}

						var dateOrder = scheduler.getDateOrder(schedule.date);

						if(!dateOrder) {
							continue;
						}

						schedules[dateOrder.order] = schedule;
					}

					for(var j = 0; j <= scheduler.nextDaysSchedule; j++) {
						var cell = $("<td>").addClass("schedule").appendTo(resource_tr);

						if(j == 0) {
							cell.addClass("today");
						}

						if(schedules[j] && schedules[j].receptionInfo.length) {
							var content = schedules[j].receptionInfo;
							var times = content.match(/\d\d:\d\d-\d\d:\d\d(?=, ?|$)/g);
							if(times) {
								for(var k = 0; k < times.length; k++) {
									if(k) {
										cell.append($("<span>").addClass("separator").text(", "));
									}
									cell.append($("<span>").addClass("time").text(times[k]));
								}
							}
							else {
								cell.addClass("special").text(content);
							}
						}
						else {
							cell.text('---').addClass("empty");
						}
					}
				}
		}
	};

	var scheduler = {
		nextDaysSchedule: null,
		nearbyDates: null,

		init: function() {
			if(scheduler.nearbyDates) {
				return;
			}

			scheduler.nextDaysSchedule = nextDaysSchedule || 2;
			scheduler.nearbyDates = {};

			var shiftingDate = new Date();
			shiftingDate.setHours(12); //Prevent to summer time shifting bug

			for(var i = 0; i <= scheduler.nextDaysSchedule; i++) {
				scheduler.nearbyDates[scheduler.formatDate(shiftingDate)] = {
					order: i,
					date: new Date(shiftingDate)
				};
				shiftingDate.setDate(shiftingDate.getDate() + 1);
			}
		},

		formatDate: function(date) {
			return scheduler.formatDateString(date.toISOString());
		},

		formatDateString: function(dateString) {
			return dateString.slice(0, 10)
		},

		getDateOrder: function(dateString) {
			scheduler.init();
			var formatted = scheduler.formatDateString(dateString);
			if(scheduler.nearbyDates[formatted]) {
				return scheduler.nearbyDates[formatted];
			}

			return null;
		}
	}
})(window, window.document);