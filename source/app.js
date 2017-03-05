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
			this.clinics.push(clinic);
		},

		getClinicResources: function(id) {
			for(var i = 0; i < this.clinics.length; i++) {
				if(this.clinics[i].id == id) {
					return this.clinics[i].resources;
					break;
				}
			}
		},

		getClinicsList: function() {
			var clinicsList = [];
			Object.keys(this.clinics).forEach(function(clinicID) {
				var clinic = {};
				clinic.id = clinicID;
				clinic.name = this.clinics[clinicID].name;
				clinicsList.push(clinic);
			}, this);
			return clinicsList;
		},

		getCurrentClinic: function() {
			return this.currentClinic;
		},

		setCurrentClinic: function(clinic) {
			this.currentClinic = clinic;
		},

		getCurrentResource: function() {
			return this.currentResource;
		},

		setCurrentResource: function(resource) {
			this.currentResource = resource;
		},

		getClinicData: function(clinicID) {
			return this.clinics[clinicID];
		},

		getLastResource: function() {
			var clinic = this.clinics[this.getCurrentClinic()];
			return clinic.resources.length;
		}
	};

	var app = {
		init: function(config) {
			view.init();

			this.resourcesPerPage = config.resourcesPerPage || 5;
			this.paginationInterval = config.paginationInterval || 10000;

			if(config.id instanceof Array) {
				var loadedCount = 0;
				config.id.forEach(function(idx) {
					this.loadData(idx, function(error, data) {
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
				}, this);
			} else if(Number.isInteger(config.id)) {
				this.loadData(config.id, function(error, data) {
					if(error) return console.log(error);
					model.addClinic({
						id: config.id,
						name: data.result.name,
						resources: data.result.availableResource
					});
					view.render();
				});
			}

			this.autoPagination();
		},

		autoPagination: function() {
			var self = this;
			setInterval(function() {
				self.nextPage();
			}, this.paginationInterval);
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
				if(departmentsCount >= this.resourcesPerPage && departments[department_name] == undefined) {
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
			}, this);
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
		init: function() {
			this.departments = document.getElementById('departments');
		},

		render: function() {
			this.departments.innerHTML = '';

			var clinic = app.getCurrentClinic();

			var clinic_title = document.createElement('h2');
			clinic_title.className = 'text-center';
			clinic_title.appendChild(document.createTextNode(clinic.name));

			this.departments.appendChild(clinic_title);

			var departments = app.getDepartments(clinic.id);
			Object.keys(departments).forEach(function(departmentKey, departmentIndex) {
				var department = departments[departmentKey];

				var title = document.createElement('h3');
				title.textContent = department.name;

				var table = document.createElement('table');
				var thead = document.createElement('thead');
				var tbody = document.createElement('tbody');

				var head_tr = document.createElement('tr');
				var table_titles = ['ФИО', 'Кабинет', 'Сегодня', '26.02', '27.02', '28.02', '1.03', '2.03', '3.03'];
				for(var i = 0; i < table_titles.length; i++) {
					var title_td = document.createElement('td');
					title_td.appendChild(document.createTextNode(table_titles[i]));
					head_tr.appendChild(title_td);
				}
				thead.appendChild(head_tr);


				for(var i = 0; i < department.resources.length; i++) {
					var resource = department.resources[i];
					var resource_tr = document.createElement('tr');
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
						var td = document.createElement('td');
						var text = document.createTextNode(resource_data[j]);
						td.appendChild(text);
						resource_tr.appendChild(td);
					}

					tbody.appendChild(resource_tr);
				}

				table.appendChild(thead);
				table.appendChild(tbody);

				this.departments.appendChild(title);
				this.departments.appendChild(table);
			});
		}
	};
})(window, window.document);