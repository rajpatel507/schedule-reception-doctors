(function(w, d){
	$(document).ready(function(){
		app.init({ids: [10000376, 10000378], paginationInterval: 5000});
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
		init: function(config) {
			view.init();

			app.paginationInterval = config.paginationInterval || 10000;

			if(config.ids instanceof Array) {
				var loadedCount = 0;
				config.ids.forEach(function(idx) {
					app.loadData(idx, function(error, data) {
						if(error) return console.log(error);
						model.addClinic({
							id: idx,
							name: data.result.name,
							resources: data.result.availableResource
						});
						if(++loadedCount == config.ids.length) {
							view.render();
						}
					});
				}, app);
			} else {
				throw new Error("Invalid IDs. config.ids must be an Array.");
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

				var table = $("<table>");
				var thead = $("<thead>");
				var tbody = $("<tbody>");

				var head_tr = $("<tr>");
				var table_titles = ["ФИО", "Кабинет", "Сегодня", "26.02", "27.02", "28.02", "1.03", "2.03", "3.03"];

				for(var i = 0; i < table_titles.length; i++) {
					$("<td>").text(table_titles[i]).appendTo(head_tr);
				}
				thead.append(head_tr);


				for(var i = 0; i < department.resources.length; i++) {
					var resource = department.resources[i];
					var resource_tr = $("<tr>");
					var resource_data = [];

					var name = resource.name;
					var cabinet = "";

					var parsed_name = name.match(/(.+)\((?:к\. ?)?(\d+)\)\s*(.*)/, '');
					if(parsed_name) {
						name = (parsed_name[1] + " " + parsed_name[3]).trim();
						cabinet = parsed_name[2];
					}

					resource_data.push(name);
					resource_data.push(cabinet);

					var schedules = [];
					var currentSchedule = null;
					var currentScheduleID = null;
					var currentDate = new Date();

					for(var j = 0; j < resource.schedule.length; j++) {
						var test_schedule = resource.schedule[j];

						if(test_schedule.date.length) {
							var test_schedule_date = new Date(test_schedule.date.substr(0, test_schedule.date.indexOf('+')));
							if(test_schedule_date.getMonth() == currentDate.getMonth() && test_schedule_date.getDate() == currentDate.getDate()) {
								currentSchedule = test_schedule;
								currentScheduleID = j;
								break;
							}
						}
					}

					if(currentSchedule != null) {
						schedules.push(currentSchedule);
						schedules.push(resource.schedule[currentScheduleID+1]);
						schedules.push(resource.schedule[currentScheduleID+2]);
						schedules.push(resource.schedule[currentScheduleID+3]);
						schedules.push(resource.schedule[currentScheduleID+4]);
						schedules.push(resource.schedule[currentScheduleID+5]);
						schedules.push(resource.schedule[currentScheduleID+6]);
					}

					for(var j = 0; j < schedules.length; j++) {
					   if(schedules[j].receptionInfo.length) resource_data.push(schedules[j].receptionInfo);
					   else resource_data.push('---');
					}

					for(var j = 0; j < resource_data.length; j++) {
						$("<td>").text(resource_data[j]).appendTo(resource_tr);
					}

					tbody.append(resource_tr);
				}
				table.append(thead);
				table.append(tbody);

				view.departments.append(table);
		}
	};
})(window, window.document);