# Resources
resource_files = $(shell $(GLIB_COMPILE_RESOURCES) --sourcedir=$(srcdir)/src --generate-dependencies $(srcdir)/src/com.endlessm.Coding.Manager.src.gresource.xml)
app_resource_files = $(shell $(GLIB_COMPILE_RESOURCES) --sourcedir=$(srcdir)/data --generate-dependencies $(srcdir)/data/com.endlessm.Coding.Manager.data.gresource.xml)


# Set EXTRA_DIST and CLEANFILES initially
EXTRA_DIST = \
	$(resource_files) \
	$(app_resource_files) \
	src/com.endlessm.Coding.Manager.in \
	src/com.endlessm.Coding.Manager.src.gresource.xml \
	data/com.endlessm.Coding.Manager.data.gresource.xml \
	$(NULL)


data/com.endlessm.Coding.Manager.data.gresource: data/com.endlessm.Coding.Manager.data.gresource.xml $(app_resource_files)
	$(AM_V_GEN) $(GLIB_COMPILE_RESOURCES) --target=$@ --sourcedir=$(srcdir)/data $<

src/com.endlessm.Coding.Manager.src.gresource: src/com.endlessm.Coding.Manager.src.gresource.xml $(resource_files)
	$(AM_V_GEN) $(GLIB_COMPILE_RESOURCES) --target=$@ --sourcedir=$(srcdir)/src $<


Manager_resources = data/com.endlessm.Coding.Manager.data.gresource \
		    src/com.endlessm.Coding.Manager.src.gresource \
		    $(NULL)


src/com.endlessm.Coding.Manager: src/com.endlessm.Coding.Manager.in $(Manager_resources)
	$(AM_V_GEN) sed \
		-e "s|[@]GJS@|$(GJS)|g" \
		-e "s|[@]PACKAGE_VERSION@|$(PACKAGE_VERSION)|g" \
		-e "s|[@]prefix@|$(prefix)|g" \
		-e "s|[@]libdir@|$(libdir)|g" \
		-e "s|[@]pkgdatadir@|$(pkgdatadir)|g" \
		$< > $@
	chmod +x $@
	echo $(app_resource_files)

# Scripts to install
bin_SCRIPTS = src/com.endlessm.Coding.Manager

# Distclean
CLEANFILES = src/com.endlessm.Coding.Manager \
	$(Manager_resources) \
	$(NULL)

