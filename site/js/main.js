export default {
    data() {
        return {
            currentRoute: '',
            currentView: 'loading',

            reportLoaded: false,
            showCredits: false,

            info: {},
            events: [],
            monLookup: {},
            
            metaMons: [],
            metaCores: [],
            metaTeams: [],

            monsSearchStr: '',
            monsSearch: [],

            showTeam: false,
            teamPlayers: [],

            sorts: {
                teams: { column: 'count', dir: 1 },
                cores: { column: 'count', dir: 1 },
                mons: { column: 'count', dir: 1 },
            },

            sortTables: false,
        }
    },
    computed: {
        currentProps() {
            if (!this.reportLoaded) {
                return {};
            }

            let route = (this.currentRoute || '/');
            let chunks = [];

            if (route != '/') {
                chunks = route.split('/');
            } else {
                chunks = [ 'report' ];
            }

            switch (chunks[0] || '') {
                case 'report':
                    this.currentView = 'report';
                    break;

                case 'faq':
                    this.currentView = 'faq';
                    break;
            }

            switch (this.currentView) {
                case 'report':
                    return {
                        info: this.info,
                        events: this.events,
                        monLookup: this.monLookup,
                        metaMons: this.metaMons,
                        metaCores: this.metaCores,
                        metaTeams: this.metaTeams,
                        showTeam: this.showTeam,
                        monsSearchStr: this.monsSearchStr,
                        monsSearch: this.monsSearch,
                    };

                case 'faq':
                    return {
                    };
            }

            return {};
        }
    },
    methods: {
        init() {
            // main listener that lets us have nice looking urls
            window.addEventListener('click', (e) => {
                if (e.target && e.target.closest('a')) {
                    const anchor = e.target.closest('a');

                    if ('pass' in anchor.dataset && anchor.dataset.pass == 1) {
                        return;
                    }

                    if (e.metaKey || e.ctrlKey) {
                        return;
                    }

                    e.preventDefault();

                    const url = anchor.getAttribute('href');
                    history.pushState({ page: url }, null, url);

                    const chips = window.location.pathname.split('/');
                    this.setCurrentRoute(chips.slice(1).join('/'));
                }
            });

            // listen on back button events
            window.addEventListener('popstate', (e) => {
                if (e.state) {
                    const chips = e.state.page.split('/');
                    this.setCurrentRoute(chips.slice(1).join('/'));
                }
            });

            document.addEventListener("keydown", (e) => {
                // ctrl+F, F3, cmd+F use the built in searches
                if (e.code === 'F3' || ((e.ctrlKey || e.metaKey) && e.code === 'KeyF')) {
                    if (this.currentView == 'report') {
                        document.getElementById('mon-filter').focus();
                        e.preventDefault();
                    }
                }

                if (event.key === 'Escape') {
                    // close popup
                    if (this.showTeam) {
                        this.closePopup();
                    }

                    // clear/reset search
                    if (this.currentView == 'report') {
                        this.filterAllData({ search: '' });
                    }
                }
            });

            // some init setup
            const chips = window.location.pathname.split('/');
            history.pushState({ page: window.location.pathname }, null, window.location.pathname);
            this.setCurrentRoute(chips.slice(1).join('/'));

            this.getReport();
        },

        setCurrentRoute(route) {
            if (!route.length) {
                route = 'report';
            }
            this.currentRoute = route;
        },

        getReport() {
            if (this.reportLoaded) {
                return;
            }

            fetch(`api/v1/report`, {
                method: "GET",
                headers: { "Content-type": "application/json" },
            }).then(r => {
                if (!r.ok) {
                }

                return r.json();
            }).then(d => {
                this.info = d.info;
                this.events = d.events;
                this.monLookup = d.lookup;

                for (let metaData of d.meta) {
                    switch (metaData.size) {
                        case 1:
                            this.metaMons = metaData.data;
                            break;
                        case 2:
                            this.metaCores = metaData.data;
                            break;
                        case 6:
                            this.metaTeams = metaData.data;
                            break;
                    }
                }

                this.metaTeams.forEach(m => {
                    m.cutRate = m.count / m.total;
                    m.winRate = m.wins / (m.losses + m.wins);
                });

                this.metaCores.forEach(m => {
                    m.cutRate = m.count / m.total;
                    m.winRate = m.wins / (m.losses + m.wins);
                });

                this.metaMons.forEach(m => {
                    m.cutRate = m.count / m.total;
                    m.winRate = m.wins / (m.losses + m.wins);
                });

                this.reportLoaded = true;
            });
        },

        getMonData(monCode) {
            if (!this.monLookup[monCode]) {
                console.log(`couldn't find ${monCode}`);
                return false;
            }

            return this.monLookup[monCode];
        },

        getSpritePos(monCode) {
            const mon = this.getMonData(monCode);
            if (!mon) {
                return "0px 0px";
            }

            return `-${mon.pos[0]}px -${mon.pos[1]}px`;
        },

        getPct(dec, precision) {
            if (isNaN(dec)) {
                return "-";
            }
            if (precision == undefined) {
                precision = 5;
            }
            return (dec * 100).toPrecision(dec >= 1 ? precision : dec < .1 ? precision - 2 : precision - 1).toLocaleString() + "%";
        },

        toggleCredits() {
            this.showCredits = !this.showCredits;
        },

        sortData(sortData) {
            const {
                type: sortType,
                column,
            } = sortData;

            let sortInfo = this.sorts[sortType];
            let sortList = sortType == 'mons' ? 
                this.metaMons : (
                    sortType == 'cores' ? this.metaCores : this.metaTeams
                );

            if (sortInfo.column == column) {
                sortInfo.dir *= -1;
            } else {
                sortInfo.column = column;
                sortInfo.dir = 1;
            }

            sortList.sort((a, b) => {
                if (a[column] < b[column]) {
                    return sortInfo.dir;
                } else if (a[column] > b[column]) {
                    return -sortInfo.dir;
                }
                return 0;
            });

            this.displayTableSorting();
        },

        displayTableSorting(sortType) {
            if (!this.sortTables) {
                this.sortTables = {
                    teams: document.querySelectorAll('#meta-teams th'),
                    cores: document.querySelectorAll('.meta-duos-half th'),
                    mons: document.querySelectorAll('.meta-mons-half th'),
                };
            }

            for (let sort of [ 'teams', 'cores', 'mons' ]) {
                Array.from(this.sortTables[sort]).forEach(c => {
                    c.classList.remove('up', 'down');
                    if (this.sorts[sort].column == c.dataset.column) {
                        c.classList.add(this.sorts[sort].dir < 0 ? 'up' : 'down');
                    }
                });
            }
        },

        filterAllData(searchData) {
            const { search: searchStr } = searchData;

            this.monsSearchStr = searchStr;
            this.monsSearch = searchStr.split(' ').filter(s => s.length);
        },

        showTeamPopup(teamData) {
            this.teamPlayers = teamData.monData;

            this.teamPlayers.fullTeamString = []
            this.teamPlayers.mons.forEach((m) => {
                this.teamPlayers.fullTeamString.push(this.getMonData(m).name);
            });

            this.teamPlayers.fullTeamString = this.teamPlayers.fullTeamString.join(', ')

            this.showTeam = true;
        },

        closePopup() {
            this.showTeam = false;
        },
    },

    components: {
        'loading': {
            template: '#loading-template',
            emits: [
                'sort-data',
                'show-team',
            ],
        },

        'report': {
            template: '#report-template',
            props: [
                'info',
                'events',
                'monLookup',
                'metaMons',
                'metaCores',
                'metaTeams',
                'showTeam',
                'monsSearchStr',
                'monsSearch',
            ],
            computed: {
                metaTeamsData: function() {
                    return this.metaTeams.filter(teamData => {
                        if (this.monsSearch.length) {
                            return this.monsSearch.every(
                                s => teamData.mons.some(m => m.includes(s))
                            );
                        }

                        return teamData;
                    });
                },
                metaMonsData: function() {
                    const mid = Math.ceil(this.metaMons.length / 2);
                    return [
                        this.metaMons.slice(0, mid),
                        this.metaMons.slice(mid),
                    ];
                },
                metaCoresData: function() {
                    let filteredCores = this.metaCores.filter(coreData => {
                        if (this.monsSearch.length) {
                            return this.monsSearch.every(
                                s => coreData.mons.some(m => m.includes(s))
                            );
                        }

                        return coreData;
                    });

                    const mid = Math.ceil(filteredCores.length / 2);
                    return [
                        filteredCores.slice(0, mid),
                        filteredCores.slice(mid),
                    ];
                },
            },
            emits: [
                'sort-data',
                'show-team',
                'search-data',
            ],
            methods: {
                getMonData(monCode) {
                    return this.$parent.getMonData(monCode);
                },
                getSpritePos(monCode) {
                    return this.$parent.getSpritePos(monCode);
                },
                getPct(dec, precision) {
                    return this.$parent.getPct(dec, precision);
                },
                sortTeams(e) {
                    this.$emit('sort-data', {
                        type: 'teams',
                        column: e.target.dataset.column,
                    });
                },
                sortCores(e) {
                    this.$emit('sort-data', {
                        type: 'cores',
                        column: e.target.dataset.column,
                    });
                },
                sortMons(e) {
                    this.$emit('sort-data', {
                        type: 'mons',
                        column: e.target.dataset.column,
                    });
                },
                showTeamPopup(monData) {
                    this.$emit('show-team', { monData: monData });
                },
                filterAllMons(e) {
                    this.$emit('search-data', {
                        search: e.target.value,
                    });
                },
                clearMonFilter() {
                    this.$emit('search-data', {
                        search: '',
                    });
                },
            },
        },

        'faq': {
            template: '#faq-template',
            emits: [
                'sort-data',
                'show-team',
            ],
        },
    },
}
