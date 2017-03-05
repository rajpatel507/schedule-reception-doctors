(function(w, d){
	$(document).ready(function(){
		app.init({id: [10000376, 10000378], resourcesPerPage: 10, paginationInterval: 5000});
	});

	var model = {
		clinics: [],
		usedDepartments: [],
		currentClinic: 0,
		currentResource: 0,

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

		getClinicResources: function(id) {
			for(var i = 0; i < model.clinics.length; i++) {
				if(model.clinics[i].id == id) {
					return model.clinics[i].resources;
					break;
				}
			}
		},

		getClinicsList: function() {
			var clinicsList = [];
			Object.keys(model.clinics).forEach(function(clinicID) {
				var clinic = {};
				clinic.id = clinicID;
				clinic.name = model.clinics[clinicID].name;
				clinicsList.push(clinic);
			}, model);
			return clinicsList;
		},

		getCurrentClinic: function() {
			return model.currentClinic;
		},

		setCurrentClinic: function(clinic) {
			model.currentClinic = clinic;
		},

		getCurrentResource: function() {
			return model.currentResource;
		},

		setCurrentResource: function(resource) {
			model.currentResource = resource;
		},

		getClinicData: function(clinicID) {
			return model.clinics[clinicID];
		},

		getClinics: function() {
			return model.clinics;
		},

		getLastResource: function() {
			var clinic = model.clinics[model.getCurrentClinic()];
			return clinic.resources.length;
		}
	};

	var app = {
		init: function(config) {
			view.init();

			app.resourcesPerPage = config.resourcesPerPage || 5;
			app.paginationInterval = config.paginationInterval || 10000;

			if(config.id instanceof Array) {
				var loadedCount = 0;
				config.id.forEach(function(idx) {
					app.loadData(idx, function(error, data) {
						if(error) return console.log(error);
						model.addClinic({
							id: idx,
							name: data.result.name,
							resources: data.result.availableResource
						});
						if(++loadedCount == config.id.length) {
							view.render();
						}
					});
				}, app);
			} else if(Number.isInteger(config.id)) {
				app.loadData(config.id, function(error, data) {
					if(error) return console.log(error);
					model.addClinic({
						id: config.id,
						name: data.result.name,
						resources: data.result.availableResource
					});
					view.render();
				});
			}

			//app.autoPagination();
		},

		autoPagination: function() {
			var self = app;
			setInterval(function() {
				self.nextPage();
			}, app.paginationInterval);
		},

		nextPage: function() {
			if(model.getCurrentResource() >= model.getLastResource()) {
				model.setCurrentClinic(model.getCurrentClinic() + 1);
				model.setCurrentResource(0);
				model.usedDepartments = [];
				if(model.getCurrentClinic() >= model.clinics.length) {
					model.setCurrentClinic(0);
				}
			}
			view.render();
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

		getDepartments: function(clinic_id) {
			var departments = [];
			var departmentsCount = 0;
			model.getClinicResources(clinic_id).forEach(function(resource) {
				var department_name = resource.lpuDepartment.name;
				if(departmentsCount >= app.resourcesPerPage && departments[department_name] == undefined) {
					if(departments[department_name] != undefined && model.usedDepartments[department_name] == undefined) {
							model.usedDepartments[department_name] = department_name;
					}
				} else {
					if(departments[department_name] == undefined && model.usedDepartments[department_name] == undefined) {
						var department = {};
						department.name = department_name;
						department.resources = [];
						departments[department_name] = department;
					}
					if(departments[department_name] != undefined) {
						departments[department_name].resources.push(resource);
						model.usedDepartments[department_name] = department_name;
						model.setCurrentResource(model.getCurrentResource() + 1);
						departmentsCount++;
					}
				}
			}, app);
			return departments;
		},

		getClinics: function() {
		   var clinics = model.getClinicsList();
		   return clinics;
		},

		getCurrentClinic: function() {
			var clinicID = model.getCurrentClinic();
			var clinic = model.getClinicData(clinicID);
			return clinic;
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

			var departments = app.getDepartments(clinic.id);
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

					var delimiter_index = resource.name.split(" ", 2).join().length;
					var name = resource.name.substr(0, delimiter_index);
					var cabinet = resource.name.substr(delimiter_index);

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