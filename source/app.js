(function(w, d){
	var ids = [10000376, 10000378];
	var paginationInterval = 10000;
	var nextDaysSchedule = 6;

	$(document).ready(function(){
		statusPanel.status("DOM done, initialize…");
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
					statusPanel.status("Loading external data (" + idx + ")");
					app.loadData(idx, function(error, data) {
						if(error) return console.log(error);
						model.addClinic({
							id: idx,
							name: data.result.name,
							resources: data.result.availableResource
						});
						if(++loadedCount == ids.length) {
							app.complete();
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
		},

		complete: function() {
			statusPanel.status("External data loaded, rendering layout…");
			view.render();

			statusPanel.status("Rendered, separate pages for screen dimensions…");
			var pages = paginator.preparePages();

			statusPanel.status("Separated, starting…");
			paginator.start(pages, app.paginationInterval);

			statusPanel.status("Ready");
		}
	};

	var view = {
		domNode: null,

		init: function() {
			view.domNode = $("#content");
		},

		render: function() {
			view.domNode.empty();

			var clinics = model.getClinics();
			Object.keys(clinics).forEach(function(clinicKey, clinicIndex) {
				view.renderClinic(clinics[clinicKey], view.domNode);
			});
		},

		renderClinic: function(clinic, parent) {
			var node = $("<div>").addClass("clinic").appendTo(parent);

			$("<h2>").text(clinic.name).appendTo(node);

			var departments = app.getDepartments(clinic);
			Object.keys(departments).forEach(function(departmentKey, departmentIndex) {
				view.renderDepartment(departments[departmentKey], node);
			});
		},

		renderDepartment: function(department, parent) {
			var node = $("<div>").addClass("department").appendTo(parent);

			$("<h3>").text(department.name).appendTo(node);

			var table = $("<table>").appendTo(node);
			var thead = $("<thead>").appendTo(table);
			var tbody = $("<tbody>").appendTo(table);
			var head_tr = $("<tr>").appendTo(thead);

			var table_titles = ["ФИО", "Кабинет"].concat(scheduler.getFormattedNearbyDates());
			table_titles[2] = "Сегодня";

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
							cell.addClass("times").addClass("times-"+k);
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
		},

		resetView: function(viewAll) {
			var root = view.domNode;
			if(viewAll) {
				$(".clinic, .department", root).show();
			} else {
				$(".clinic, .department", root).hide();
			}
		},

		showPage: function(page) {
			page.set.show();
			page.clinic.fadeIn();
		},

		changePage: function(page, previousPage) {
			if(page.clinicIndex != previousPage.clinicIndex) {
				page.set.show();
				previousPage.clinic.fadeOut(function(){
					page.clinic.fadeIn();
					previousPage.set.hide();
				});
			}
			else {
				previousPage.set.fadeOut(function(){
					page.set.fadeIn();
				});
			}
		}


	};

	var paginator = {
		currentPageId: 0,
		preparePages: function() {
			var root = view.domNode;
			var viewPortHeight = root.parent().outerHeight();
			var pages = [];

			$(".clinic", root).each(function(clinicIndex){
				$(".clinic, .department", root).hide();

				var clinic = $(this);
				clinic.show();

				//Open empty set
				var clinicPages = [];
				var set = [];
				clinicPages.push(set);

				var items = $(".department", clinic);
				items.each(function(departmentIndex){
					var singleOversized = false;
					var _this = $(this).show();

					//Size ok
					if(clinic.outerHeight() < viewPortHeight) {
						set.push(this);
					}
					else {
						//No items in set - oversized item
						if(set.length == 0) {
							set.push(this);
							singleOversized = true;
						}

						//Rotate set
						set = [];
						clinicPages.push(set);
						items.hide();

						//Add to set only when not already added
						if(!singleOversized) {
							_this.show();
							set.push(this);
						}
					}
				});

				clinicPages.forEach(function(set, setIndex){
					if(set.length) {
						pages.push({
							clinicIndex: clinicIndex,
							setIndex: setIndex,
							clinic: clinic,
							set: $(set)
						});
					}
				})
			});

			return pages;
		},

		start: function(pages, interval) {
			view.resetView();
			paginator.currentPageId = 0;
			var currentPage = pages[paginator.currentPageId];

			view.showPage(currentPage);
			statusPanel.page(paginator.currentPageId, pages.length);

			window.setInterval(function() {
				paginator.rotate(pages);
			}, interval);
		},

		rotate: function(pages) {
			var previousPage = pages[paginator.currentPageId];
			paginator.currentPageId = paginator.nextPageId(pages, paginator.currentPageId);

			var page = pages[paginator.currentPageId];

			view.changePage(page, previousPage);
			statusPanel.page(paginator.currentPageId, pages.length);
		},

		nextPageId: function(pages, pageId){
			pageId++;
			return pageId < pages.length ? pageId : 0;
		}

	}

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
		},
		getFormattedNearbyDates: function(){
			var formatted = [];
			scheduler.init();
			Object.keys(scheduler.nearbyDates).forEach(function(dateKey, dateIndex) {
				var date = scheduler.nearbyDates[dateKey].date;
				formatted.push(date.getDate() + ". " + (date.getMonth()+1) + ".");
			});
			return formatted;
		}
	}

	var statusPanel = {
		status: function(text){
			$("#status").text(text);
		},
		page: function(page, pagesCount){
			$("#paginator").text("Page " + (page+1) + " of " + pagesCount);
		}
	}
	statusPanel.status("Javascript loaded, waiting to DOM…");
})(window, window.document);